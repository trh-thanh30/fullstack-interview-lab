import { and, asc, gte, lt } from "drizzle-orm";

import type { Database } from "@/db/client";
import { aiCalls } from "@/db/schema";

export const opsRangeValues = ["24h", "7d", "30d"] as const;
export type OpsRange = (typeof opsRangeValues)[number];

export type OpsThresholds = {
  errorRatePercent: number;
  costUsd: number;
  p95LatencyMs: number;
};

export class OpsStore {
  constructor(private readonly database: Database) {}

  async getReport(range: OpsRange, thresholds = readOpsThresholds(), now = new Date()) {
    const since = rangeStart(range, now);
    const rows = await this.database
      .select()
      .from(aiCalls)
      .where(and(gte(aiCalls.createdAt, since), lt(aiCalls.createdAt, now)))
      .orderBy(asc(aiCalls.createdAt));
    const failures = rows.filter(({ status }) => status === "failed");
    const latency = rows.map(({ latencyMs }) => latencyMs).sort((left, right) => left - right);
    const totalCost = roundMoney(rows.reduce((sum, row) => sum + (row.estimatedCostUsd ?? 0), 0));
    const errorRate = rows.length ? (failures.length / rows.length) * 100 : 0;
    const p95LatencyMs = percentile(latency, 0.95);
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = `${row.feature}::${row.model}`;
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }
    const breakdown = [...groups].map(([key, calls]) => {
      const [feature, model] = key.split("::") as [string, string];
      const failed = calls.filter(({ status }) => status === "failed").length;
      return {
        feature,
        model,
        calls: calls.length,
        failures: failed,
        inputTokens: calls.reduce((sum, row) => sum + (row.inputTokens ?? 0), 0),
        outputTokens: calls.reduce((sum, row) => sum + (row.outputTokens ?? 0), 0),
        costUsd: roundMoney(calls.reduce((sum, row) => sum + (row.estimatedCostUsd ?? 0), 0)),
        averageLatencyMs: Math.round(calls.reduce((sum, row) => sum + row.latencyMs, 0) / calls.length),
      };
    }).sort((left, right) => right.costUsd - left.costUsd || right.calls - left.calls);

    const alerts = [
      ...(errorRate >= thresholds.errorRatePercent && rows.length
        ? [{ severity: "critical" as const, message: `Error rate ${errorRate.toFixed(1)}% vượt ngưỡng ${thresholds.errorRatePercent}%.` }]
        : []),
      ...(totalCost >= thresholds.costUsd
        ? [{ severity: "warning" as const, message: `Estimated cost $${totalCost.toFixed(4)} vượt budget $${thresholds.costUsd.toFixed(2)}.` }]
        : []),
      ...(p95LatencyMs >= thresholds.p95LatencyMs
        ? [{ severity: "warning" as const, message: `P95 latency ${p95LatencyMs}ms vượt ngưỡng ${thresholds.p95LatencyMs}ms.` }]
        : []),
    ];

    return {
      summary: {
        calls: rows.length,
        failures: failures.length,
        errorRate: Number(errorRate.toFixed(1)),
        inputTokens: rows.reduce((sum, row) => sum + (row.inputTokens ?? 0), 0),
        outputTokens: rows.reduce((sum, row) => sum + (row.outputTokens ?? 0), 0),
        costUsd: totalCost,
        p95LatencyMs,
      },
      breakdown,
      alerts,
      recentFailures: failures.slice(-12).reverse().map((row) => ({
        correlationId: row.correlationId,
        feature: row.feature,
        model: row.model,
        errorCode: row.errorCode,
        latencyMs: row.latencyMs,
        createdAt: row.createdAt,
      })),
      thresholds,
    };
  }

  async prune(retentionDays: number, now = new Date()) {
    if (!Number.isInteger(retentionDays) || retentionDays < 7 || retentionDays > 3650) {
      throw new Error("AI log retention phải nằm trong khoảng 7–3650 ngày.");
    }
    const cutoff = new Date(now.getTime() - retentionDays * 86_400_000);
    return this.database.delete(aiCalls).where(lt(aiCalls.createdAt, cutoff)).returning({ id: aiCalls.id });
  }
}

export function readOpsThresholds(env: Record<string, string | undefined> = process.env): OpsThresholds {
  return {
    errorRatePercent: numberFromEnv(env.AI_ALERT_ERROR_RATE_PERCENT, 20),
    costUsd: numberFromEnv(env.AI_ALERT_COST_USD, 2),
    p95LatencyMs: numberFromEnv(env.AI_ALERT_P95_LATENCY_MS, 15_000),
  };
}

function rangeStart(range: OpsRange, now: Date) {
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return new Date(now.getTime() - hours * 3_600_000);
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  return values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)] ?? 0;
}

function numberFromEnv(value: string | undefined, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function roundMoney(value: number) {
  return Number(value.toFixed(6));
}
