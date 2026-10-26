import { describe, expect, it, vi } from "vitest";

import {
  EMBEDDING_DIMENSIONS,
  OpenAIEmbeddingProvider,
  buildEmbeddingInput,
} from "../embedding-provider";

describe("OpenAIEmbeddingProvider", () => {
  it("requests ordered 1536-dimensional float embeddings", async () => {
    const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.25);
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { index: 1, embedding: vector },
            { index: 0, embedding: vector.map(() => 0.5) },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = new OpenAIEmbeddingProvider("test-key", "text-embedding-3-small", request);

    const embeddings = await provider.embed(["first", "second"]);

    expect(embeddings[0]?.[0]).toBe(0.5);
    expect(embeddings[1]?.[0]).toBe(0.25);
    expect(request).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining(`"dimensions":${EMBEDDING_DIMENSIONS}`),
      }),
    );
  });

  it("caps embedding input size", () => {
    expect(
      buildEmbeddingInput({ heading: null, content: "x".repeat(30_000), sourceTitle: "Source" }),
    ).toHaveLength(24_000);
  });
});
