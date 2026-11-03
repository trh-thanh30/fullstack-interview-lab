import { AiProviderError, type StructuredGenerationInput } from "./provider";

export type AiOperationLimit = {
  maxInputChars: number;
  maxImageBytes: number;
  maxOutputTokens: number;
};

const defaultLimit: AiOperationLimit = {
  maxInputChars: 80_000,
  maxImageBytes: 0,
  maxOutputTokens: 2_000,
};

export const aiOperationLimits: Record<string, AiOperationLimit> = {
  "question-generation": { maxInputChars: 60_000, maxImageBytes: 0, maxOutputTokens: 3_000 },
  "essay-evaluation": { maxInputChars: 100_000, maxImageBytes: 0, maxOutputTokens: 2_500 },
  "mock-adaptive-decision": { maxInputChars: 45_000, maxImageBytes: 0, maxOutputTokens: 500 },
  "coding-static-review": { maxInputChars: 130_000, maxImageBytes: 0, maxOutputTokens: 2_000 },
  "system-design-review": { maxInputChars: 150_000, maxImageBytes: 9_000_000, maxOutputTokens: 3_000 },
  learning_plan_narration: { maxInputChars: 30_000, maxImageBytes: 0, maxOutputTokens: 600 },
  "ai-eval-regression": { maxInputChars: 80_000, maxImageBytes: 0, maxOutputTokens: 2_500 },
};

export function enforceAiOperationLimit<T>(input: StructuredGenerationInput<T>) {
  const limit = aiOperationLimits[input.feature] ?? defaultLimit;
  const inputChars = input.instructions.length + input.input.length;
  const imageBytes = input.images?.reduce((total, image) => total + image.data.byteLength, 0) ?? 0;

  if (inputChars > limit.maxInputChars || imageBytes > limit.maxImageBytes) {
    throw new AiProviderError(
      "input_limit",
      `AI input vượt giới hạn của ${input.feature}.`,
      { correlationId: input.correlationId },
    );
  }

  return {
    ...limit,
    maxOutputTokens: Math.min(input.maxOutputTokens ?? limit.maxOutputTokens, limit.maxOutputTokens),
  };
}
