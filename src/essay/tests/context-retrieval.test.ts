import { describe, expect, it, vi } from "vitest";

import type { EmbeddingProvider } from "@/content/embedding-provider";

import { ContextRetriever, type ContextRepository } from "../context-retrieval";

describe("ContextRetriever", () => {
  it("keeps only technology-scoped candidates above the regression threshold", async () => {
    const findSimilar = vi.fn<ContextRepository["findSimilar"]>().mockResolvedValue([
      candidate("react-hooks", 0.91),
      candidate("generic-js", 0.72),
      candidate("weak-match", 0.51),
    ]);
    const embedder: EmbeddingProvider = {
      model: "test-embedding",
      embed: vi.fn().mockResolvedValue([[1, 0, 0]]),
    };
    const retriever = new ContextRetriever({ findSimilar }, embedder, {
      topK: 2,
      similarityThreshold: 0.68,
    });

    const result = await retriever.retrieve({
      question: "React useEffect cleanup hoạt động thế nào?",
      topicId: "frontend-topic",
      technologyIds: ["react-tech"],
    });

    expect(result.map(({ id }) => id)).toEqual(["react-hooks", "generic-js"]);
    expect(findSimilar).toHaveBeenCalledWith(expect.objectContaining({
      topicId: "frontend-topic",
      technologyIds: ["react-tech"],
      embeddingModel: "test-embedding",
    }));
  });
});

function candidate(id: string, similarity: number) {
  return {
    id,
    sourceTitle: "React docs",
    heading: "Effects",
    pageNumber: null,
    content: "Evidence",
    similarity,
  };
}

