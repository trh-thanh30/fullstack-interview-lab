import { buildEmbeddingInput, type EmbeddingProvider } from "@/content/embedding-provider";

export type RetrievalCandidate = {
  id: string;
  sourceTitle: string;
  heading: string | null;
  pageNumber: number | null;
  content: string;
  similarity: number;
};

export interface ContextRepository {
  findSimilar(input: {
    embedding: number[];
    embeddingModel: string;
    topicId: string;
    technologyIds: string[];
    limit: number;
  }): Promise<RetrievalCandidate[]>;
}

export class ContextRetriever {
  constructor(
    private readonly repository: ContextRepository,
    private readonly embedder: EmbeddingProvider,
    private readonly options: { topK?: number; similarityThreshold?: number } = {},
  ) {}

  async retrieve(input: {
    question: string;
    topicId: string;
    technologyIds: string[];
  }) {
    const [embedding] = await this.embedder.embed([
      buildEmbeddingInput({
        sourceTitle: "Interview question",
        heading: null,
        content: input.question,
      }),
    ], "query");
    if (!embedding) return [];

    const threshold = this.options.similarityThreshold ?? 0.68;
    const candidates = await this.repository.findSimilar({
      embedding,
      embeddingModel: this.embedder.model,
      topicId: input.topicId,
      technologyIds: input.technologyIds,
      limit: this.options.topK ?? 5,
    });

    return candidates
      .filter(({ similarity }) => similarity >= threshold)
      .slice(0, this.options.topK ?? 5);
  }
}

