// @vitest-environment node

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import { seedTaxonomy } from "@/db/seed";

import { DrizzleSourceNormalizationStore } from "../drizzle-source-normalization-store";
import { EMBEDDING_DIMENSIONS } from "../embedding-provider";

describe("DrizzleSourceNormalizationStore", () => {
  let client: PGlite;
  let store: DrizzleSourceNormalizationStore;

  beforeAll(async () => {
    client = new PGlite({ extensions: { vector } });
    const migrationDirectory = join(process.cwd(), "drizzle");
    const migrations = (await readdir(migrationDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const filename of migrations) {
      const migration = await readFile(join(migrationDirectory, filename), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) {
        if (statement.trim()) await client.exec(statement);
      }
    }

    const database = drizzle({ client });
    await seedTaxonomy(database);
    await client.exec(`
      INSERT INTO sources (id, type, status, title, uri, checksum)
      VALUES
        ('00000000-0000-0000-0000-000000000001', 'manual', 'processed', 'Source A', 'manual://a', 'source-a'),
        ('00000000-0000-0000-0000-000000000002', 'manual', 'processed', 'Source B', 'manual://b', 'source-b');
      INSERT INTO source_chunks (id, source_id, position, content, checksum)
      VALUES
        ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, 'Node.js event loop', 'chunk-a'),
        ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 1, 'Node event loop', 'chunk-b');
    `);
    store = new DrizzleSourceNormalizationStore(database as unknown as Database);
  }, 30_000);

  afterAll(async () => {
    await client.close();
  });

  it("persists classification, embedding and duplicate review candidates", async () => {
    const chunks = await store.listChunks();
    expect(chunks).toHaveLength(2);

    await store.saveClassifications(
      chunks.map((chunk) => ({
        chunkId: chunk.id,
        topicSlug: "backend",
        technologySlugs: ["nodejs"],
        level: "middle",
        contentType: "concept",
      })),
      new Date("2026-10-26T00:00:00.000Z"),
    );
    await store.saveEmbeddings(
      [
        {
          chunkId: chunks[0]!.id,
          embedding: Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) =>
            index === 0 ? 1 : 0,
          ),
          model: "test-embedding",
        },
      ],
      new Date("2026-10-26T00:00:00.000Z"),
    );
    await store.saveDuplicateCandidates(
      [
        {
          firstChunkId: chunks[0]!.id,
          secondChunkId: chunks[1]!.id,
          kind: "semantic",
          similarity: 0.95,
        },
      ],
      new Date("2026-10-26T00:00:00.000Z"),
    );

    const classified = await client.query<{
      topic_slug: string;
      technology_slug: string;
      level: string;
      content_type: string;
      embedding_model: string;
    }>(`
      SELECT topic.slug AS topic_slug, technology.slug AS technology_slug,
        chunk.level, chunk.content_type, chunk.embedding_model
      FROM source_chunks AS chunk
      INNER JOIN topics AS topic ON topic.id = chunk.topic_id
      INNER JOIN source_chunk_technologies AS link ON link.source_chunk_id = chunk.id
      INNER JOIN technologies AS technology ON technology.id = link.technology_id
      WHERE chunk.id = '${chunks[0]!.id}'
    `);
    const candidates = await client.query<{ similarity: number; status: string }>(`
      SELECT similarity, status FROM source_duplicate_candidates
    `);

    expect(classified.rows[0]).toMatchObject({
      topic_slug: "backend",
      technology_slug: "nodejs",
      level: "middle",
      content_type: "concept",
      embedding_model: "test-embedding",
    });
    expect(candidates.rows[0]).toMatchObject({ similarity: 0.95, status: "pending" });
  });
});
