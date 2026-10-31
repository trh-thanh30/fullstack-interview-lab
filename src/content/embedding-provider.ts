import { createGoogle, type GoogleEmbeddingModelOptions } from "@ai-sdk/google";
import { embedMany } from "ai";

export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 1536;

export type EmbeddingPurpose = "document" | "query";

export interface EmbeddingProvider {
  readonly model: string;
  embed(inputs: string[], purpose?: EmbeddingPurpose): Promise<number[][]>;
}

type EmbeddingRunner = (input: {
  values: string[];
  purpose: EmbeddingPurpose;
}) => Promise<number[][]>;

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  private readonly provider: ReturnType<typeof createGoogle>;

  constructor(
    apiKey: string,
    model = DEFAULT_EMBEDDING_MODEL,
    private readonly runner?: EmbeddingRunner,
  ) {
    this.model = model;
    this.provider = createGoogle({ apiKey });
  }

  async embed(inputs: string[], purpose: EmbeddingPurpose = "document") {
    if (inputs.length === 0) return [];
    const values = inputs.map((input) => formatGeminiEmbeddingInput(input, purpose));
    const embeddings = this.runner
      ? await this.runner({ values, purpose })
      : (await embedMany({
          model: this.provider.embedding(this.model),
          values,
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(45_000),
          providerOptions: {
            google: {
              outputDimensionality: EMBEDDING_DIMENSIONS,
            } satisfies GoogleEmbeddingModelOptions,
          },
        })).embeddings;

    if (
      embeddings.length !== inputs.length ||
      embeddings.some((embedding) => embedding.length !== EMBEDDING_DIMENSIONS)
    ) {
      throw new Error(
        `Gemini returned an invalid embedding batch; expected ${inputs.length} vectors with ${EMBEDDING_DIMENSIONS} dimensions.`,
      );
    }
    return embeddings;
  }
}

export function formatGeminiEmbeddingInput(input: string, purpose: EmbeddingPurpose) {
  return purpose === "query"
    ? `task: question answering | query: ${input}`
    : `title: none | text: ${input}`;
}

export function buildEmbeddingInput(input: {
  heading: string | null;
  content: string;
  sourceTitle: string;
}) {
  const value = [input.sourceTitle, input.heading, input.content].filter(Boolean).join("\n\n");

  // Keep enough room for the Gemini retrieval prefix and stay below its input limit.
  return value.slice(0, 24_000);
}
