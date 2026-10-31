// @vitest-environment node

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import * as schema from "@/db/schema";

import { MockInterviewStore } from "../mock-interview-store";

describe("MockInterviewStore state persistence", () => {
  let client: PGlite;
  let store: MockInterviewStore;
  const userId = "00000000-0000-4000-8000-000000000071";

  beforeAll(async () => {
    client = new PGlite({ extensions: { vector } });
    const files = (await readdir(join(process.cwd(), "drizzle"))).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const migration = await readFile(join(process.cwd(), "drizzle", file), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await client.exec(statement);
    }
    await client.query("INSERT INTO users (id, email) VALUES ($1, 'mock@example.com')", [userId]);
    store = new MockInterviewStore(drizzle({ client, schema }) as unknown as Database);
  }, 30_000);

  afterAll(async () => client.close());

  it("persists state, deadline and version while rejecting a stale request", async () => {
    const now = new Date("2026-10-31T01:00:00Z");
    const sessionId = await store.createSession({
      userId,
      configuration: { topicIds: [], technologyIds: [], level: "middle", questionCount: 4, durationMinutes: 30, maxFollowUpsPerQuestion: 1 },
      now,
    });
    const version = await store.transition({ userId, sessionId, expectedVersion: 1, from: "setup", to: "asking", startClock: true, now });
    expect(version).toBe(2);
    await expect(store.transition({ userId, sessionId, expectedVersion: 1, from: "setup", to: "asking", startClock: true, now })).rejects.toThrow("Session đã thay đổi");
    const resumed = await store.getOwnedSession(userId, sessionId);
    expect(resumed).toMatchObject({ state: "asking", version: 2, currentPosition: 0 });
    expect(resumed?.startedAt?.toISOString()).toBe(now.toISOString());
    expect(resumed?.deadlineAt?.toISOString()).toBe("2026-10-31T01:30:00.000Z");
  });

  it("rejects invalid transitions at the domain boundary", async () => {
    const sessionId = await store.createSession({
      userId,
      configuration: { topicIds: [], technologyIds: [], level: "senior", questionCount: 3, durationMinutes: 20, maxFollowUpsPerQuestion: 0 },
    });
    await expect(store.transition({ userId, sessionId, expectedVersion: 1, from: "setup", to: "summary" })).rejects.toThrow("không thể chuyển");
  });
});
