import { randomUUID } from "node:crypto";

import type { z } from "zod";

import type { AiProvider } from "@/ai/provider";

import type { GoldenEvalCase } from "./golden-dataset";

export function validateGoldenBaseline(testCase: GoldenEvalCase) {
  const parsed = testCase.schema.safeParse(testCase.baselineOutput);
  if (!parsed.success) return { passed: false, reason: parsed.error.message, score: null };
  const score = parsed.data.score;
  const delta = Math.abs(score - testCase.expectedScore);
  return { passed: delta <= testCase.tolerance, reason: `delta=${delta}, tolerance=${testCase.tolerance}`, score };
}

export async function runLiveGoldenCase(provider: AiProvider, testCase: GoldenEvalCase) {
  const result = await provider.generateStructured({
    correlationId: randomUUID(),
    feature: "ai-eval-regression",
    promptVersion: `golden-${testCase.id}-v1`,
    schemaName: testCase.schemaName,
    schema: testCase.schema as z.ZodType<{ score: number }>,
    instructions: testCase.instructions,
    input: testCase.input,
    maxOutputTokens: 2_500,
  });
  const score = result.output.score;
  const delta = Math.abs(score - testCase.expectedScore);
  return { passed: delta <= testCase.tolerance, score, delta, model: result.model };
}
