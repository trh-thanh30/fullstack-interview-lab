// @vitest-environment node

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/db/client";
import * as schema from "@/db/schema";

import { OpsStore, readOpsThresholds } from "../ops-store";

describe("OpsStore", () => {
  let client: PGlite;
  let store: OpsStore;

  beforeAll(async () => {
    client = new PGlite({ extensions: { vector } });
    const files = (await readdir(join(process.cwd(), "drizzle"))).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const migration = await readFile(join(process.cwd(), "drizzle", file), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await client.exec(statement);
    }
    store = new OpsStore(drizzle({ client, schema }) as unknown as Database);
  }, 30_000);

  afterAll(async () => client.close());

  it("aggregates cost and exposes failed correlation IDs", async () => {
    await client.query(`INSERT INTO ai_calls (correlation_id, feature, provider, model, prompt_version, status, latency_ms, input_tokens, output_tokens, estimated_cost_usd, created_at) VALUES
      ('00000000-0000-4000-8000-000000000081', 'essay-evaluation', 'google', 'gemini-test', 'v1', 'succeeded', 1000, 100, 20, 0.01, '2026-11-03T01:00:00Z'),
      ('00000000-0000-4000-8000-000000000082', 'essay-evaluation', 'google', 'gemini-test', 'v1', 'failed', 20000, null, null, null, '2026-11-03T02:00:00Z')`);
    const report = await store.getReport("24h", { errorRatePercent: 20, costUsd: 1, p95LatencyMs: 15_000 }, new Date("2026-11-03T03:00:00Z"));
    expect(report.summary).toMatchObject({ calls: 2, failures: 1, errorRate: 50, inputTokens: 100, outputTokens: 20, costUsd: 0.01, p95LatencyMs: 20000 });
    expect(report.recentFailures[0]?.correlationId).toBe("00000000-0000-4000-8000-000000000082");
    expect(report.alerts).toHaveLength(2);
  });

  it("reads safe threshold defaults", () => {
    expect(readOpsThresholds({})).toEqual({ errorRatePercent: 20, costUsd: 2, p95LatencyMs: 15000 });
  });
});
