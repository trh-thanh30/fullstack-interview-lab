// @vitest-environment node

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import * as schema from "@/db/schema";
import { seedTaxonomy } from "@/db/seed";
import type { QuestionWriteInput } from "@/questions/question-form";
import { QuestionStore } from "@/questions/question-store";

import type { PracticeConfiguration } from "../practice-config";
import { PracticeStore } from "../practice-store";

describe("PracticeStore MCQ session", () => {
  let client: PGlite;
  let store: PracticeStore;
  let questionStore: QuestionStore;
  let topicId: string;
  let technologyId: string;
  const userId = "00000000-0000-4000-8000-000000000011";
  const otherUserId = "00000000-0000-4000-8000-000000000012";
  const sourceChunkId = "20000000-0000-4000-8000-000000000011";

  beforeAll(async () => {
    client = new PGlite({ extensions: { vector } });
    const files = (await readdir(join(process.cwd(), "drizzle"))).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const migration = await readFile(join(process.cwd(), "drizzle", file), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) {
        if (statement.trim()) await client.exec(statement);
      }
    }

    const database = drizzle({ client, schema });
    await seedTaxonomy(database);
    topicId = (await client.query<{ id: string }>("SELECT id FROM topics WHERE slug = 'backend'")).rows[0]!.id;
    technologyId = (await client.query<{ id: string }>("SELECT id FROM technologies WHERE slug = 'nodejs'")).rows[0]!.id;
    await client.query("INSERT INTO users (id, email) VALUES ($1, 'practice@example.com'), ($2, 'other@example.com')", [userId, otherUserId]);
    await client.query(`
      INSERT INTO sources (id, type, status, title, uri, checksum)
      VALUES ('10000000-0000-4000-8000-000000000011', 'manual', 'processed', 'Node handbook', 'manual://practice-node', 'practice-source')
    `);
    await client.query(`
      INSERT INTO source_chunks (id, source_id, topic_id, position, heading, content, checksum)
      VALUES ($1, '10000000-0000-4000-8000-000000000011', $2, 0, 'Event loop', 'Node source evidence', 'practice-chunk')
    `, [sourceChunkId, topicId]);
    Object.assign(database, {
      batch: async (statements: Array<{ execute(): Promise<unknown> }>) => {
        const results = [];
        for (const statement of statements) results.push(await statement.execute());
        return results;
      },
    });
    const typedDatabase = database as unknown as Database;
    store = new PracticeStore(typedDatabase);
    questionStore = new QuestionStore(typedDatabase);
  }, 30_000);

  afterAll(async () => client.close());

  it("runs a private, resumable and immutable MCQ session through retry", async () => {
    const firstQuestionId = await questionStore.create(question("Node.js xử lý microtask queue ở thời điểm nào?", "Sau operation hiện tại."), userId);
    const secondQuestionId = await questionStore.create(question("Backpressure trong Node.js stream giải quyết vấn đề gì?", "Giới hạn producer khi consumer chậm."), userId);
    await questionStore.create({ ...question("Draft không được chọn vào practice?", "Không."), status: "draft" }, userId);

    const configuration = config(2);
    expect(await store.countAvailable(configuration)).toBe(2);
    const sessionId = await store.createSession({ userId, configuration, now: new Date("2026-10-29T01:00:00Z") });

    const initial = await store.getSessionForPlay(userId, sessionId);
    expect(initial).toMatchObject({ state: "asking", currentPosition: 0, total: 2, answer: null });
    expect(JSON.stringify(initial)).not.toContain("answerKeySnapshot");
    expect(JSON.stringify(initial)).not.toContain("explanation");
    expect(await store.getSessionForPlay(otherUserId, sessionId)).toBeNull();

    const firstSnapshot = await currentSnapshot(sessionId, 0);
    await client.query("UPDATE questions SET prompt = 'Question bank changed' WHERE id IN ($1, $2)", [firstQuestionId, secondQuestionId]);
    const afterBankEdit = await store.getSessionForPlay(userId, sessionId);
    expect(afterBankEdit?.state === "asking" ? afterBankEdit.question.prompt : "").not.toBe("Question bank changed");

    await store.submitAnswer({
      userId,
      sessionId,
      sessionQuestionId: firstSnapshot.id,
      selectedChoiceId: firstSnapshot.answerKey[0]!,
    });
    await expect(store.submitAnswer({
      userId,
      sessionId,
      sessionQuestionId: firstSnapshot.id,
      selectedChoiceId: firstSnapshot.answerKey[0]!,
    })).rejects.toThrow("đã được trả lời");
    const answered = await store.getSessionForPlay(userId, sessionId);
    expect(answered?.state === "asking" ? answered.answer : null).toMatchObject({ isCorrect: true });

    expect(await store.advance({ userId, sessionId, sessionQuestionId: firstSnapshot.id })).toEqual({ completed: false });
    const resumed = await store.getSessionForPlay(userId, sessionId);
    expect(resumed).toMatchObject({ state: "asking", currentPosition: 1, answer: null });

    const secondSnapshot = await currentSnapshot(sessionId, 1);
    const wrongChoice = secondSnapshot.choices.find(({ id }) => !secondSnapshot.answerKey.includes(id))!;
    await store.submitAnswer({ userId, sessionId, sessionQuestionId: secondSnapshot.id, selectedChoiceId: wrongChoice.id });
    expect(await store.advance({ userId, sessionId, sessionQuestionId: secondSnapshot.id, now: new Date("2026-10-29T01:05:00Z") })).toEqual({ completed: true });

    const result = await store.getResult(userId, sessionId);
    expect(result).toMatchObject({ state: "completed", total: 2, correct: 1 });
    if (!result || result.state !== "completed") throw new Error("Expected completed result");
    expect(result.wrong).toHaveLength(1);
    expect(result.durationMs).toBe(300_000);

    const retryId = await store.createRetrySession(userId, sessionId);
    expect(await store.getSessionForPlay(userId, retryId)).toMatchObject({ state: "asking", total: 1 });
  }, 30_000);

  async function currentSnapshot(sessionId: string, position: number) {
    const row = (await client.query<{
      id: string;
      answer_key_snapshot: string[];
      choices_snapshot: Array<{ id: string; content: string; position: number }>;
    }>("SELECT id, answer_key_snapshot, choices_snapshot FROM session_questions WHERE session_id = $1 AND position = $2", [sessionId, position])).rows[0]!;
    return { id: row.id, answerKey: row.answer_key_snapshot, choices: row.choices_snapshot };
  }

  function config(questionCount: number): PracticeConfiguration {
    return { topicId, technologyIds: [technologyId], level: "middle", questionCount, strategy: "random" };
  }

  function question(prompt: string, explanation: string): QuestionWriteInput {
    return {
      topicId,
      technologyIds: [technologyId],
      type: "mcq",
      level: "middle",
      status: "published",
      prompt,
      explanation,
      isManual: false,
      sourceChunkIds: [sourceChunkId],
      choices: [
        { content: "Đáp án đúng", isCorrect: true, position: 0 },
        { content: "Đáp án nhiễu", isCorrect: false, position: 1 },
      ],
      rubric: null,
    };
  }
});
