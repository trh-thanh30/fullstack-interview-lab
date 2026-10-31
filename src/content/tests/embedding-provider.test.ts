import { describe, expect, it, vi } from "vitest";

import {
  EMBEDDING_DIMENSIONS,
  GeminiEmbeddingProvider,
  buildEmbeddingInput,
  formatGeminiEmbeddingInput,
} from "../embedding-provider";

describe("GeminiEmbeddingProvider", () => {
  it("formats document batches and requires 1536-dimensional vectors", async () => {
    const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.25);
    const runner = vi.fn().mockResolvedValue([
      vector.map(() => 0.5),
      vector,
    ]);
    const provider = new GeminiEmbeddingProvider("test-key", "gemini-embedding-2", runner);

    const embeddings = await provider.embed(["first", "second"], "document");

    expect(embeddings[0]?.[0]).toBe(0.5);
    expect(embeddings[1]?.[0]).toBe(0.25);
    expect(runner).toHaveBeenCalledWith({
      values: ["title: none | text: first", "title: none | text: second"],
      purpose: "document",
    });
  });

  it("uses the Gemini question-answering prefix for retrieval queries", () => {
    expect(formatGeminiEmbeddingInput("React effect cleanup", "query")).toBe(
      "task: question answering | query: React effect cleanup",
    );
  });

  it("caps embedding input size", () => {
    expect(
      buildEmbeddingInput({ heading: null, content: "x".repeat(30_000), sourceTitle: "Source" }),
    ).toHaveLength(24_000);
  });
});
