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

import { LearningStore } from "../learning-store";

describe("LearningStore", () => {
  let client: PGlite;
  let store: LearningStore;
  let backendId: string;
  const userId = "00000000-0000-4000-8000-000000000071";
  const dueQuestionId = "10000000-0000-4000-8000-000000000071";
  const freshQuestionId = "10000000-0000-4000-8000-000000000072";

  beforeAll(async () => {
    client = new PGlite({ extensions: { vector } });
    const files = (await readdir(join(process.cwd(), "drizzle")))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const migration = await readFile(join(process.cwd(), "drizzle", file), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) {
        if (statement.trim()) await client.exec(statement);
      }
    }
    const database = drizzle({ client, schema });
    await seedTaxonomy(database);
    backendId = (await client.query<{ id: string }>("SELECT id FROM topics WHERE slug = 'backend'")).rows[0]!.id;
    await client.query("INSERT INTO users (id, email) VALUES ($1, 'learner@example.com')", [userId]);
    await client.query(
      `INSERT INTO questions (id, topic_id, type, level, status, prompt, is_manual)
       VALUES ($1, $3, 'mcq', 'middle', 'published', 'Due question', true),
              ($2, $3, 'mcq', 'middle', 'published', 'Fresh question', true)`,
      [dueQuestionId, freshQuestionId, backendId],
    );
    store = new LearningStore(database as unknown as Database);
  }, 30_000);

  afterAll(async () => client.close());

  it("puts overdue questions before new questions and allows reset", async () => {
    await store.recordReview({
      userId,
      questionId: dueQuestionId,
      correct: false,
      confidence: 1,
      reviewedAt: new Date("2026-11-01T00:00:00.000Z"),
    });
    const queue = await store.getDailyQueue(userId, 10, new Date("2026-11-03T00:00:00.000Z"));
    expect(queue.map(({ questionId, kind }) => [questionId, kind])).toEqual([
      [dueQuestionId, "due"],
      [freshQuestionId, "new"],
    ]);

    await store.resetSchedule(userId, dueQuestionId);
    const scheduleCount = await client.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM review_schedules WHERE user_id = $1",
      [userId],
    );
    expect(scheduleCount.rows[0]?.count).toBe(0);
  });

  it("excludes abandoned sessions from dashboard completion metrics", async () => {
    const completedId = "20000000-0000-4000-8000-000000000071";
    const abandonedId = "20000000-0000-4000-8000-000000000072";
    const completedSq = "30000000-0000-4000-8000-000000000071";
    const abandonedSq = "30000000-0000-4000-8000-000000000072";
    await client.query(
      `INSERT INTO interview_sessions (id, user_id, mode, state, started_at, completed_at)
       VALUES ($1, $3, 'mcq', 'completed', '2026-11-02T00:00:00Z', '2026-11-02T00:10:00Z'),
              ($2, $3, 'mcq', 'abandoned', '2026-11-02T01:00:00Z', '2026-11-02T01:30:00Z')`,
      [completedId, abandonedId, userId],
    );
    await client.query(
      `INSERT INTO session_questions (id, session_id, question_id, position, question_type, prompt_snapshot, topic_id_snapshot, topic_name_snapshot)
       VALUES ($1, $3, $5, 0, 'mcq', 'Completed', $6, 'Backend'),
              ($2, $4, $5, 0, 'mcq', 'Abandoned', $6, 'Backend')`,
      [completedSq, abandonedSq, completedId, abandonedId, dueQuestionId, backendId],
    );
    await client.query(
      `INSERT INTO answers (session_question_id, attempt_number, is_correct, confidence, submitted_at)
       VALUES ($1, 1, true, 2, '2026-11-02T00:05:00Z'),
              ($2, 1, false, 2, '2026-11-02T01:05:00Z')`,
      [completedSq, abandonedSq],
    );

    const dashboard = await store.getDashboard(userId, "30d", new Date("2026-11-03T00:00:00Z"));
    expect(dashboard.summary).toMatchObject({ sessions: 1, totalMinutes: 10, accuracy: 100, answers: 1 });
  });
});
