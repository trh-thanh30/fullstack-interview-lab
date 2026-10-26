export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingProvider {
  readonly model: string;
  embed(inputs: string[]): Promise<number[][]>;
}

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[]; index?: number }>;
  error?: { message?: string };
};

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;

  constructor(
    private readonly apiKey: string,
    model = DEFAULT_EMBEDDING_MODEL,
    private readonly request: typeof fetch = fetch,
  ) {
    this.model = model;
  }

  async embed(inputs: string[]) {
    if (inputs.length === 0) return [];

    const response = await this.request("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: inputs,
        model: this.model,
        encoding_format: "float",
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });
    const payload = (await response.json()) as EmbeddingResponse;

    if (!response.ok) {
      throw new Error(`OpenAI embedding request failed (${response.status}): ${payload.error?.message ?? "Unknown error"}`);
    }

    const embeddings = [...(payload.data ?? [])]
      .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
      .map((item) => item.embedding);

    if (
      embeddings.length !== inputs.length ||
      embeddings.some((embedding) => embedding?.length !== EMBEDDING_DIMENSIONS)
    ) {
      throw new Error(
        `OpenAI returned an invalid embedding batch; expected ${inputs.length} vectors with ${EMBEDDING_DIMENSIONS} dimensions.`,
      );
    }

    return embeddings as number[][];
  }
}

export function buildEmbeddingInput(input: {
  heading: string | null;
  content: string;
  sourceTitle: string;
}) {
  const value = [input.sourceTitle, input.heading, input.content].filter(Boolean).join("\n\n");

  // A conservative character cap keeps a chunk below the embedding endpoint's
  // per-input token limit even for code-heavy content.
  return value.slice(0, 24_000);
}
