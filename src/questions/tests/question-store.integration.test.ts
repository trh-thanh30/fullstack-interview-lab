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

import type { QuestionWriteInput } from "../question-form";
import { QuestionStore } from "../question-store";

describe("QuestionStore lifecycle", () => {
  let client: PGlite;
  let store: QuestionStore;
  let topicId: string;
  let technologyId: string;
  const userId = "00000000-0000-4000-8000-000000000001";
  const sourceChunkId = "20000000-0000-4000-8000-000000000001";

  beforeAll(async () => {
    client = new PGlite({ extensions: { vector } });
    const directory = join(process.cwd(), "drizzle");
    const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const migration = await readFile(join(directory, file), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) {
        if (statement.trim()) await client.exec(statement);
      }
    }

    const database = drizzle({ client, schema });
    await seedTaxonomy(database);
    const topics = await client.query<{ id: string }>("SELECT id FROM topics WHERE slug = 'backend'");
    const technologies = await client.query<{ id: string }>("SELECT id FROM technologies WHERE slug = 'nodejs'");
    topicId = topics.rows[0]!.id;
    technologyId = technologies.rows[0]!.id;
    await client.query("INSERT INTO users (id, email) VALUES ($1, 'owner@example.com')", [userId]);
    await client.query(`
      INSERT INTO sources (id, type, status, title, uri, checksum)
      VALUES ('10000000-0000-4000-8000-000000000001', 'manual', 'processed', 'Node source', 'manual://node', 'source-checksum')
    `);
    await client.query(`
      INSERT INTO source_chunks (id, source_id, topic_id, position, content, checksum)
      VALUES ($1, '10000000-0000-4000-8000-000000000001', $2, 0, 'Event loop source', 'chunk-checksum')
    `, [sourceChunkId, topicId]);
    await client.query(`
      INSERT INTO source_chunk_technologies (source_chunk_id, technology_id)
      VALUES ($1, $2)
    `, [sourceChunkId, technologyId]);
    Object.assign(database, {
      batch: async (statements: Array<{ execute(): Promise<unknown> }>) => {
        const results = [];
        for (const statement of statements) results.push(await statement.execute());
        return results;
      },
    });
    store = new QuestionStore(database as unknown as Database);
  }, 30_000);

  afterAll(async () => client.close());

  it("creates, filters, versions and archives a question without hard deletion", async () => {
    const id = await store.create(mcqInput(), userId, new Date("2026-10-27T00:00:00Z"));
    const filtered = await store.list({ technologyId, status: "published" });
    expect(filtered.map((question) => question.id)).toContain(id);

    const created = await store.findById(id);
    expect(created).toMatchObject({ version: 1, status: "published", isManual: false });
    expect(created?.choices.filter((choice) => choice.isCorrect)).toHaveLength(1);
    expect(created?.sourceChunkIds).toEqual([sourceChunkId]);

    await store.update(id, essayInput(), userId, new Date("2026-10-27T01:00:00Z"));
    const updated = await store.findById(id);
    expect(updated).toMatchObject({ version: 2, type: "deep_dive", status: "published" });
    expect(updated?.choices).toHaveLength(0);
    expect(updated?.rubric?.dimensions).toHaveLength(4);

    await store.archive(id, new Date("2026-10-27T02:00:00Z"));
    expect(await store.findById(id)).toMatchObject({ status: "archived" });
  });

  it("persists AI generation audit and forces generated questions to draft", async () => {
    const sources = await store.getGenerationSources([sourceChunkId]);
    expect(sources[0]).toMatchObject({ topicId, technologyIds: [technologyId] });

    const id = await store.createGeneratedDraft({
      question: { ...mcqInput(), status: "published", isManual: true },
      userId,
      generation: {
        providerResponseId: "resp-qb-002",
        model: "test-model",
        promptVersion: "qb-002-v1",
        inputTokens: 123,
        outputTokens: 45,
      },
    });
    const question = await store.findById(id);
    const runs = await client.query<{
      question_id: string;
      model: string;
      prompt_version: string;
      input_tokens: number;
      output_tokens: number;
    }>("SELECT question_id, model, prompt_version, input_tokens, output_tokens FROM question_generation_runs WHERE question_id = $1", [id]);

    expect(question).toMatchObject({ status: "draft", isManual: false });
    expect(runs.rows[0]).toEqual({
      question_id: id,
      model: "test-model",
      prompt_version: "qb-002-v1",
      input_tokens: 123,
      output_tokens: 45,
    });
  });

  it("reviews drafts with publish metadata and an append-only decision audit", async () => {
    const approvedId = await generatedDraft("resp-review-approve");
    const reviewedAt = new Date("2026-10-27T03:00:00Z");

    const queue = await store.listReviewQueue();
    expect(queue.find(({ id }) => id === approvedId)).toMatchObject({
      generationModel: "test-model",
      sources: [expect.objectContaining({ id: sourceChunkId })],
    });

    await store.review({
      questionId: approvedId,
      reviewerUserId: userId,
      action: "approve",
      now: reviewedAt,
    });
    expect(await store.findById(approvedId)).toMatchObject({
      status: "published",
      reviewedByUserId: userId,
      lastReviewedAt: reviewedAt,
    });

    const rejectedId = await generatedDraft("resp-review-reject");
    await expect(store.review({
      questionId: rejectedId,
      reviewerUserId: userId,
      action: "reject",
      reason: "no",
    })).rejects.toThrow("5 ký tự");
    await store.review({
      questionId: rejectedId,
      reviewerUserId: userId,
      action: "reject",
      reason: "Nội dung không chính xác.",
    });

    const outdatedId = await generatedDraft("resp-review-outdated");
    await store.review({ questionId: outdatedId, reviewerUserId: userId, action: "mark_outdated" });

    const mergedId = await generatedDraft("resp-review-merge");
    await store.review({
      questionId: mergedId,
      reviewerUserId: userId,
      action: "merge",
      mergedIntoQuestionId: approvedId,
    });

    const decisions = await client.query<{
      question_id: string;
      action: string;
      reason: string | null;
      merged_into_question_id: string | null;
    }>("SELECT question_id, action, reason, merged_into_question_id FROM question_review_events ORDER BY created_at");
    expect(decisions.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ question_id: approvedId, action: "approve" }),
      expect.objectContaining({ question_id: rejectedId, action: "reject", reason: "Nội dung không chính xác." }),
      expect.objectContaining({ question_id: outdatedId, action: "mark_outdated" }),
      expect.objectContaining({ question_id: mergedId, action: "merge", merged_into_question_id: approvedId }),
    ]));
  });

  async function generatedDraft(providerResponseId: string) {
    return store.createGeneratedDraft({
      question: { ...mcqInput(), status: "draft" },
      userId,
      generation: {
        providerResponseId,
        model: "test-model",
        promptVersion: "qb-002-v1",
        inputTokens: 10,
        outputTokens: 20,
      },
    });
  }

  function mcqInput(): QuestionWriteInput {
    return {
      topicId,
      technologyIds: [technologyId],
      type: "mcq",
      level: "middle",
      status: "published",
      prompt: "How does the Node.js event loop schedule microtasks?",
      explanation: "Microtasks run after the current operation and before the next phase.",
      isManual: false,
      sourceChunkIds: [sourceChunkId],
      choices: [
        { content: "Before the next event-loop phase", isCorrect: true, position: 0 },
        { content: "Only when the process exits", isCorrect: false, position: 1 },
      ],
      rubric: null,
    };
  }

  function essayInput(): QuestionWriteInput {
    return {
      ...mcqInput(),
      type: "deep_dive",
      choices: [],
      rubric: {
        referenceAnswer: "Explain phases, queues and starvation risk.",
        dimensions: [
          { key: "correctness", label: "Correctness", description: "Correct claims", weight: 40 },
          { key: "completeness", label: "Completeness", description: "Complete", weight: 30 },
          { key: "clarity", label: "Clarity", description: "Clear", weight: 15 },
          { key: "practical", label: "Practical", description: "Practical", weight: 15 },
        ],
      },
    };
  }
});
