// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedTaxonomy } from "../seed";

describe("initial database migration", () => {
  let client: PGlite;

  beforeAll(async () => {
    client = new PGlite({ extensions: { vector } });

    const migration = await readFile(
      join(process.cwd(), "drizzle", "0000_equal_xorn.sql"),
      "utf8",
    );

    for (const statement of migration.split("--> statement-breakpoint")) {
      const sql = statement.trim();

      if (sql) {
        await client.exec(sql);
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
        "rubrics",
        "sources",
        "source_chunks",
        "question_sources",
        "interview_sessions",
        "session_questions",
        "answers",
        "evaluations",
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
    ]);
    expect(technologies.rows[0]?.count).toBe(18);
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
});
