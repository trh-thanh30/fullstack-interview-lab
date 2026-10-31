import { createGoogle } from "@ai-sdk/google";
import { APICallError, Output, streamText } from "ai";

import {
  AiProviderError,
  type AiProvider,
  type StructuredGenerationInput,
} from "./provider";

export class GeminiStructuredProvider implements AiProvider {
  readonly name = "google";
  private readonly provider: ReturnType<typeof createGoogle>;

  constructor(
    apiKey: string,
    readonly model: string,
    provider?: ReturnType<typeof createGoogle>,
  ) {
    this.provider = provider ?? createGoogle({ apiKey });
  }

  async generateStructured<T>(input: StructuredGenerationInput<T>) {
    const startedAt = performance.now();

    try {
      const result = streamText({
        model: this.provider(this.model),
        output: Output.object({
          name: input.schemaName,
          schema: input.schema,
        }),
        system: input.instructions,
        prompt: input.input,
        maxOutputTokens: input.maxOutputTokens ?? 3_000,
        maxRetries: 1,
        timeout: 45_000,
        providerOptions: {
          google: { structuredOutputs: true },
        },
      });
      const [output, usage, response] = await Promise.all([
        result.output,
        result.usage,
        result.response,
      ]);

      return {
        correlationId: input.correlationId,
        providerResponseId: response.id ?? null,
        model: this.model,
        output: output as T,
        usage: {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
        },
        latencyMs: Math.round(performance.now() - startedAt),
      };
    } catch (error) {
      if (isAbortError(error)) {
        throw new AiProviderError("timeout", "Gemini evaluation đã quá thời gian chờ.", { cause: error });
      }
      if (APICallError.isInstance(error)) {
        if (error.statusCode === 400) {
          throw new AiProviderError("invalid_output", "Gemini không chấp nhận structured output schema.", { cause: error });
        }
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw new AiProviderError("auth", "Gemini API key chưa được cấu hình hợp lệ.", { cause: error });
        }
        if (error.statusCode === 429) {
          throw new AiProviderError("rate_limit", "Gemini đang quá tải. Hãy thử lại sau.", { cause: error });
        }
        throw new AiProviderError("provider_unavailable", "Gemini tạm thời không khả dụng.", { cause: error });
      }
      throw new AiProviderError("invalid_output", "Gemini output không đúng schema.", { cause: error });
    }
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || /timed?\s*out/i.test(error.message));
}

