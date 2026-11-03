import type { z } from 'zod';

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type StructuredGenerationResult<T> = {
  correlationId: string;
  providerResponseId: string | null;
  model: string;
  output: T;
  usage: AiUsage;
  latencyMs: number;
};

export type StructuredGenerationInput<T> = {
  correlationId: string;
  feature: string;
  promptVersion: string;
  instructions: string;
  input: string;
  schemaName: string;
  schema: z.ZodType<T>;
  maxOutputTokens?: number;
  images?: Array<{ data: Uint8Array; mediaType: 'image/png' | 'image/jpeg' | 'image/webp' }>;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateStructured<T>(
    input: StructuredGenerationInput<T>
  ): Promise<StructuredGenerationResult<T>>;
}

export type AiErrorCode =
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'refusal'
  | 'input_limit'
  | 'invalid_output'
  | 'provider_unavailable';

export class AiProviderError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
    options?: { cause?: unknown; correlationId?: string }
  ) {
    super(message, options);
    this.name = 'AiProviderError';
    this.correlationId = options?.correlationId;
  }

  readonly correlationId?: string;
}
