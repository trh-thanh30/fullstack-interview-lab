// @vitest-environment node

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedStarterQuestions, seedSystemDesignProblems, seedTaxonomy } from "../seed";

describe("initial database migration", () => {
  let client: PGlite;

  beforeAll(async () => {
    client = new PGlite({ extensions: { vector } });

    const migrationDirectory = join(process.cwd(), "drizzle");
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const migrationFile of migrationFiles) {
      const migration = await readFile(join(migrationDirectory, migrationFile), "utf8");

      for (const statement of migration.split("--> statement-breakpoint")) {
        const sql = statement.trim();

        if (sql) {
          await client.exec(sql);
        }
      }
    }
  }, 30_000);

  afterAll(async () => {
    await client.close();
  });

  it("creates every domain table and the vector index on an empty database", async () => {
    const tables = await client.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    expect(tables.rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        "users",
        "topics",
        "technologies",
        "questions",
        "question_choices",
        "question_generation_runs",
        "question_review_events",
        "rubrics",
        "sources",
        "source_chunks",
        "source_chunk_technologies",
        "source_duplicate_candidates",
        "question_sources",
        "interview_sessions",
        "session_questions",
        "answers",
        "evaluations",
        "system_design_problems",
        "system_design_checkpoint_responses",
        "system_design_reviews",
        "design_attachments",
        "coding_drafts",
        "coding_reviews",
        "review_schedules",
      ]),
    );

    const indexes = await client.query<{ indexname: string }>(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);

    expect(indexes.rows.map((row) => row.indexname)).toContain(
      "source_chunks_embedding_hnsw_idx",
    );
  });

  it("seeds the initial categories and technologies idempotently", async () => {
    const database = drizzle({ client });

    await seedTaxonomy(database);
    await seedTaxonomy(database);

    const topics = await client.query<{ slug: string }>("SELECT slug FROM topics ORDER BY position");
    const technologies = await client.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM technologies",
    );

    expect(topics.rows.map((row) => row.slug)).toEqual([
      "frontend",
      "backend",
      "devops",
      "architecture",
      "java-sql-exam",
      "java-sql-extended",
    ]);
    expect(technologies.rows[0]?.count).toBe(23);
  });

  it("enforces source uniqueness and question foreign keys", async () => {
    await client.query(`
      INSERT INTO sources (type, title, uri, checksum)
      VALUES ('manual', 'Source A', 'manual://source-a', 'same-checksum')
    `);

    await expect(
      client.query(`
        INSERT INTO sources (type, title, uri, checksum)
        VALUES ('manual', 'Source B', 'manual://source-b', 'same-checksum')
      `),
    ).rejects.toThrow();

    await expect(
      client.query(`
        INSERT INTO questions (topic_id, type, level, prompt)
        VALUES ('00000000-0000-0000-0000-000000000000', 'mcq', 'junior', 'Invalid topic')
      `),
    ).rejects.toThrow();
  });

  it("supports explicit manual provenance for question publishing", async () => {
    const columns = await client.query<{ column_name: string; column_default: string | null }>(`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_name = 'questions' AND column_name = 'is_manual'
    `);

    expect(columns.rows[0]?.column_name).toBe("is_manual");
    expect(columns.rows[0]?.column_default).toContain("false");
  });

  it("seeds three reviewed system-design templates idempotently", async () => {
    const database = drizzle({ client });
    await seedSystemDesignProblems(database);
    await seedSystemDesignProblems(database);
    const result = await client.query<{ count: number }>("SELECT count(*)::int AS count FROM system_design_problems WHERE reviewed_at IS NOT NULL");
    expect(result.rows[0]?.count).toBe(3);
  });

  it("seeds the published starter question pack idempotently", async () => {
    const database = drizzle({ client });
    await seedTaxonomy(database);
    await seedStarterQuestions(database);
    await seedStarterQuestions(database);

    const questions = await client.query<{ type: string; count: number }>(`
      SELECT type, count(*)::int AS count
      FROM questions
      WHERE is_manual = true AND status = 'published'
      GROUP BY type
      ORDER BY type
    `);
    const invalidMcq = await client.query<{ count: number }>(`
      SELECT count(*)::int AS count
      FROM questions q
      WHERE q.type = 'mcq'
        AND q.is_manual = true
        AND (
          SELECT count(*)
          FROM question_choices qc
          WHERE qc.question_id = q.id AND qc.is_correct = true
        ) <> 1
    `);
    const interviewWithoutRubric = await client.query<{ count: number }>(`
      SELECT count(*)::int AS count
      FROM questions q
      LEFT JOIN rubrics r ON r.question_id = q.id
      WHERE q.type IN ('short_answer', 'deep_dive')
        AND q.is_manual = true
        AND r.id IS NULL
    `);

    expect(questions.rows).toEqual([
      { type: "mcq", count: 540 },
      { type: "short_answer", count: 8 },
      { type: "deep_dive", count: 25 },
      { type: "coding", count: 35 },
    ]);
    expect(invalidMcq.rows[0]?.count).toBe(0);
    expect(interviewWithoutRubric.rows[0]?.count).toBe(0);
  });
});
