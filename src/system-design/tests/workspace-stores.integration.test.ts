// @vitest-environment node

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CodingStore } from "@/coding/coding-store";
import type { Database } from "@/db/client";
import * as schema from "@/db/schema";
import { seedAll } from "@/db/seed";

import { SystemDesignStore } from "../system-design-store";

describe("Phase 6 workspace persistence", () => {
  let client: PGlite;
  let database: Database;
  const userId = "00000000-0000-4000-8000-000000000061";

  beforeAll(async () => {
    client = new PGlite({ extensions: { vector } });
    for (const file of (await readdir(join(process.cwd(), "drizzle"))).filter((name) => name.endsWith(".sql")).sort()) {
      const migration = await readFile(join(process.cwd(), "drizzle", file), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await client.exec(statement);
    }
    const db = drizzle({ client, schema });
    await seedAll(db);
    await client.query("INSERT INTO users (id, email) VALUES ($1, 'phase6@example.com')", [userId]);
    database = db as unknown as Database;
  }, 30_000);

  afterAll(async () => client.close());

  it("seeds three reviewed templates and advances a resumable checkpoint", async () => {
    const store = new SystemDesignStore(database);
    const problems = await store.listProblems();
    expect(problems).toHaveLength(3);
    const sessionId = await store.createSession(userId, problems[0]!.id, new Date("2026-10-31T01:00:00Z"));
    await store.saveNotes({ userId, sessionId, checkpoint: "clarify", notes: "## Scope\nUsers create links and redirects must remain highly available." });
    const reviewInput = await store.getReviewInput(userId, sessionId, 1, "clarify");
    expect(reviewInput?.response.notes).toContain("highly available");
    await store.completeCheckpoint({ userId, sessionId, expectedVersion: 1, responseId: reviewInput!.response.id, review: review(), model: "fake", promptVersion: "test", correlationId: "00000000-0000-4000-8000-000000000062", providerResponseId: null });
    const resumed = await store.getSession(userId, sessionId);
    expect(resumed?.session).toMatchObject({ currentPosition: 1, version: 2, state: "answering" });
    expect(resumed?.currentCheckpoint?.key).toBe("estimate");
  });

  it("autosaves code and persists an explicit not-run review snapshot", async () => {
    const topic = (await client.query<{ id: string }>("SELECT id FROM topics WHERE slug = 'backend'")).rows[0]!;
    const questionId = "00000000-0000-4000-8000-000000000063";
    await client.query("INSERT INTO questions (id, topic_id, type, level, status, prompt, is_manual) VALUES ($1, $2, 'coding', 'middle', 'published', 'Implement an LRU cache with get and put operations.', true)", [questionId, topic.id]);
    await client.query("INSERT INTO rubrics (question_id, dimensions, reference_answer) VALUES ($1, $2, 'Use a hash map and doubly linked list.')", [questionId, JSON.stringify([{ key: "correctness", label: "Correctness", description: "Works", weight: 100 }])]);
    const store = new CodingStore(database);
    const sessionId = await store.createSession(userId, questionId);
    await store.saveDraft({ userId, sessionId, language: "typescript", code: "class LruCache { get(key: string) { return key; } }", explanation: "Placeholder implementation." });
    await store.appendReview({ userId, sessionId, output: codingReview(), model: "fake", promptVersion: "test", correlationId: "00000000-0000-4000-8000-000000000064", providerResponseId: null });
    const session = await store.getSession(userId, sessionId);
    expect(session?.draft.code).toContain("LruCache");
    expect(session?.reviews[0]).toMatchObject({ executionStatus: "not_run", language: "typescript" });
    expect(session?.reviews[0]?.codeSnapshot).toContain("LruCache");
  });
});

function review() { return { score: 70, dimensionScores: { requirements: 70, estimation: 70, architecture: 70, data: 70, scaling: 70, reliability: 70, security: 70 }, strengths: ["Scope"], gaps: [], assumptions: [], tradeoffs: [], nextQuestions: [], summary: "Good" }; }
function codingReview() { return { score: 50, complexity: "Unknown", correctnessAssumptions: ["Input valid"], edgeCases: ["Empty"], strengths: [], risks: ["Incomplete"], suggestions: ["Implement eviction"], summary: "Code chưa được chạy; static review only." }; }
