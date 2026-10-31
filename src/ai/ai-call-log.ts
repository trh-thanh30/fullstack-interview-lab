import { aiCalls } from "@/db/schema";
import type { Database } from "@/db/client";

import type { AiErrorCode, AiUsage } from "./provider";

export type AiCallLog = {
  correlationId: string;
  feature: string;
  provider: string;
  model: string;
  promptVersion: string;
  status: "succeeded" | "failed";
  errorCode?: AiErrorCode;
  latencyMs: number;
  usage?: AiUsage;
};

export class AiCallLogger {
  constructor(private readonly database: Database) {}

  async write(entry: AiCallLog) {
    await this.database.insert(aiCalls).values({
      correlationId: entry.correlationId,
      feature: entry.feature,
      provider: entry.provider,
      model: entry.model,
      promptVersion: entry.promptVersion,
      status: entry.status,
      errorCode: entry.errorCode,
      latencyMs: entry.latencyMs,
      inputTokens: entry.usage?.inputTokens,
      outputTokens: entry.usage?.outputTokens,
      estimatedCostUsd: estimateCost(entry.usage),
    });
  }
}

export function estimateCost(
  usage?: AiUsage,
  env: Record<string, string | undefined> = process.env,
) {
  if (!usage) return null;
  const inputRate = Number(env.AI_INPUT_COST_PER_1M ?? 0);
  const outputRate = Number(env.AI_OUTPUT_COST_PER_1M ?? 0);
  return Number(((usage.inputTokens * inputRate + usage.outputTokens * outputRate) / 1_000_000).toFixed(6));
}

