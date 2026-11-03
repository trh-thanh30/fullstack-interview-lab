// @vitest-environment node

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { Database } from "@/db/client";
import * as schema from "@/db/schema";
import { seedTaxonomy } from "@/db/seed";

import { PrivacyStore } from "../privacy-store";

describe("PrivacyStore", () => {
  let client: PGlite;
  let store: PrivacyStore;
  const userId = "00000000-0000-4000-8000-000000000091";

  beforeAll(async () => {
    client = new PGlite({ extensions: { vector } });
    const files = (await readdir(join(process.cwd(), "drizzle"))).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const migration = await readFile(join(process.cwd(), "drizzle", file), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await client.exec(statement);
    }
    const database = drizzle({ client, schema });
    Object.assign(database, { batch: async (statements: Array<{ execute(): Promise<unknown> }>) => { const values = []; for (const statement of statements) values.push(await statement.execute()); return values; } });
    await seedTaxonomy(database);
    const topicId = (await client.query<{ id: string }>("SELECT id FROM topics WHERE slug = 'architecture'")).rows[0]!.id;
    await client.query("INSERT INTO users (id, email) VALUES ($1, 'privacy@example.com')", [userId]);
    await client.query("INSERT INTO questions (id, topic_id, type, level, status, prompt, created_by_user_id) VALUES ('10000000-0000-4000-8000-000000000091', $1, 'system_design', 'senior', 'published', 'Private design', $2)", [topicId, userId]);
    await client.query("INSERT INTO interview_sessions (id, user_id, mode, state) VALUES ('20000000-0000-4000-8000-000000000091', $1, 'system_design', 'completed')", [userId]);
    await client.query("INSERT INTO design_attachments (session_id, kind, blob_url, blob_pathname, alt_text) VALUES ('20000000-0000-4000-8000-000000000091', 'image', 'https://private.example/secret', 'private/secret', 'diagram')");
    store = new PrivacyStore(database as unknown as Database);
  }, 30_000);

  afterAll(async () => client.close());

  it("exports owned data without private Blob locators, then deletes cascade-owned data", async () => {
    const exported = await store.exportUserData(userId);
    expect(exported.profile.email).toBe("privacy@example.com");
    expect(JSON.stringify(exported)).not.toContain("private.example");
    expect(JSON.stringify(exported)).not.toContain("private/secret");
    expect(await store.listOwnedBlobUrls(userId)).toEqual(["https://private.example/secret"]);

    await store.deleteUserData(userId);
    const users = await client.query<{ count: number }>("SELECT count(*)::int AS count FROM users WHERE id = $1", [userId]);
    const sessions = await client.query<{ count: number }>("SELECT count(*)::int AS count FROM interview_sessions WHERE user_id = $1", [userId]);
    expect(users.rows[0]?.count).toBe(0);
    expect(sessions.rows[0]?.count).toBe(0);
  });
});
