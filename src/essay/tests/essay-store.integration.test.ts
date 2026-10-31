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
import { QuestionStore } from "@/questions/question-store";

import { EssayStore } from "../essay-store";

describe("EssayStore", () => {
  let client: PGlite;
  let store: EssayStore;
  let questionStore: QuestionStore;
  let questionId: string;
  const userId = "00000000-0000-4000-8000-000000000021";
  const otherUserId = "00000000-0000-4000-8000-000000000022";
  const sourceChunkId = "20000000-0000-4000-8000-000000000021";

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
    const topicId = (await client.query<{ id: string }>("SELECT id FROM topics WHERE slug = 'backend'")).rows[0]!.id;
    const technologyId = (await client.query<{ id: string }>("SELECT id FROM technologies WHERE slug = 'nodejs'")).rows[0]!.id;
    await client.query("INSERT INTO users (id, email) VALUES ($1, 'essay@example.com'), ($2, 'other-essay@example.com')", [userId, otherUserId]);
    await client.query(`
      INSERT INTO sources (id, type, status, title, uri, checksum)
      VALUES ('10000000-0000-4000-8000-000000000021', 'manual', 'processed', 'Node guide', 'manual://essay-node', 'essay-source')
    `);
    await client.query(`
      INSERT INTO source_chunks (id, source_id, topic_id, position, heading, content, checksum)
      VALUES ($1, '10000000-0000-4000-8000-000000000021', $2, 0, 'Streams', 'Backpressure controls producer speed.', 'essay-chunk')
    `, [sourceChunkId, topicId]);
    Object.assign(database, {
      batch: async (statements: Array<{ execute(): Promise<unknown> }>) => {
        const results = [];
        for (const statement of statements) results.push(await statement.execute());
        return results;
      },
    });
    const typedDatabase = database as unknown as Database;
    store = new EssayStore(typedDatabase);
    questionStore = new QuestionStore(typedDatabase);
    questionId = await questionStore.create({
      topicId,
      technologyIds: [technologyId],
      sourceChunkIds: [sourceChunkId],
      type: "short_answer",
      level: "middle",
      status: "published",
      prompt: "Giải thích backpressure trong Node.js streams và cách xử lý.",
      explanation: "Kiểm tra hiểu biết về flow control.",
      isManual: false,
      choices: [],
      rubric: {
        dimensions: [
          { key: "correctness", label: "Correctness", description: "Đúng", weight: 40 },
          { key: "completeness", label: "Completeness", description: "Đủ", weight: 30 },
          { key: "clarity", label: "Clarity", description: "Rõ", weight: 15 },
          { key: "practical", label: "Practical", description: "Thực tế", weight: 15 },
        ],
        referenceAnswer: "Tôn trọng return value của write và chờ drain.",
      },
    }, userId);
  }, 30_000);

  afterAll(async () => client.close());

  it("preserves drafts and appends attempts and evaluations", async () => {
    expect(await store.listPublishedQuestions()).toHaveLength(1);
    const sessionId = await store.createSession(userId, questionId);
    expect(await store.getSession(otherUserId, sessionId)).toBeNull();

    await store.saveDraft({ userId, sessionId, answerText: "Bản nháp chưa submit" });
    expect((await store.getSession(userId, sessionId))?.draft).toBe("Bản nháp chưa submit");

    const firstAnswerId = await store.createAttempt({
      userId,
      sessionId,
      answerText: "Backpressure giới hạn producer khi consumer đang xử lý chậm.",
    });
    const input = await store.getEvaluationInput(userId, sessionId, firstAnswerId);
    expect(input).toMatchObject({ answerId: firstAnswerId, technologyIds: [expect.any(String)] });

    await store.appendEvaluation(evaluation(sessionId, firstAnswerId, input!.rubric.id, "00000000-0000-4000-8000-000000000031"));
    await store.appendEvaluation(evaluation(sessionId, firstAnswerId, input!.rubric.id, "00000000-0000-4000-8000-000000000032"));
    await store.createAttempt({
      userId,
      sessionId,
      answerText: "Lần hai: kiểm tra write(), dừng producer và tiếp tục sau event drain.",
    });

    const session = await store.getSession(userId, sessionId);
    expect(session?.attempts).toHaveLength(2);
    expect(session?.attempts.find(({ id }) => id === firstAnswerId)?.evaluations).toHaveLength(2);
  }, 30_000);
});

function evaluation(sessionId: string, answerId: string, rubricId: string, correlationId: string) {
  return {
    sessionId,
    answerId,
    rubricId,
    model: "test-model",
    promptVersion: "ai-003-test",
    output: {
      score: 75,
      dimensions: {
        correctness: { score: 80, feedback: "Đúng." },
        completeness: { score: 70, feedback: "Khá đủ." },
        clarity: { score: 80, feedback: "Rõ." },
        practical: { score: 60, feedback: "Cần ví dụ." },
      },
      strengths: ["Đúng core concept"],
      missingPoints: ["Event drain"],
      incorrectClaims: [],
      uncertainty: null,
      suggestedAnswer: "Kiểm tra write và chờ drain.",
      followUpQuestion: "highWaterMark ảnh hưởng thế nào?",
    },
    sourceChunkIds: ["20000000-0000-4000-8000-000000000021"],
    correlationId,
    providerResponseId: "response-test",
    latencyMs: 20,
    inputTokens: 100,
    outputTokens: 50,
  };
}

