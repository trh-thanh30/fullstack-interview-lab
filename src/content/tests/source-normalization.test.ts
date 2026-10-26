import { describe, expect, it } from "vitest";

import type { EmbeddingProvider } from "../embedding-provider";
import {
  findDuplicateCandidates,
  normalizeSourceContent,
  type NormalizationChunk,
} from "../source-normalization";
import { InMemoryNormalizationStore } from "./mocks/in-memory-normalization-store";

const baseChunks: NormalizationChunk[] = [
  {
    id: "a",
    sourceId: "source-a",
    sourceTitle: "Node guide",
    sourceUri: "file:///a.md",
    heading: "Node.js",
    content: "Node event loop concept",
    checksum: "same",
    embedding: [1, 0],
    embeddingModel: "test-embedding",
  },
  {
    id: "b",
    sourceId: "source-b",
    sourceTitle: "Backend guide",
    sourceUri: "file:///b.md",
    heading: "Event loop",
    content: "Node event loop concept",
    checksum: "same",
    embedding: [1, 0],
    embeddingModel: "test-embedding",
  },
  {
    id: "c",
    sourceId: "source-c",
    sourceTitle: "Server guide",
    sourceUri: "file:///c.md",
    heading: "Event loop explained",
    content: "A very similar explanation",
    checksum: "different",
    embedding: [0.99, 0.01],
    embeddingModel: "test-embedding",
  },
];

describe("source normalization", () => {
  it("detects exact matches before semantic matches and only across sources", () => {
    const candidates = findDuplicateCandidates(baseChunks, 0.98);

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ firstChunkId: "a", secondChunkId: "b", kind: "exact" }),
        expect.objectContaining({ firstChunkId: "a", secondChunkId: "c", kind: "semantic" }),
      ]),
    );
    expect(
      candidates.find(
        (candidate) =>
          candidate.firstChunkId === "a" &&
          candidate.secondChunkId === "b" &&
          candidate.kind === "semantic",
      ),
    ).toBeUndefined();
  });

  it("classifies every chunk, embeds only stale chunks and queues candidates", async () => {
    const chunks = structuredClone(baseChunks);
    chunks[2]!.embedding = null;
    chunks[2]!.embeddingModel = null;
    const store = new InMemoryNormalizationStore(chunks);
    const embedder: EmbeddingProvider = {
      model: "test-embedding",
      async embed(inputs) {
        return inputs.map(() => [0.99, 0.01]);
      },
    };

    const result = await normalizeSourceContent({
      store,
      embedder,
      semanticThreshold: 0.98,
      now: new Date("2026-10-26T00:00:00.000Z"),
    });

    expect(store.classifications).toHaveLength(3);
    expect(store.embeddings.map(({ chunkId }) => chunkId)).toEqual(["c"]);
    expect(store.candidates.some(({ kind }) => kind === "exact")).toBe(true);
    expect(store.candidates.some(({ kind }) => kind === "semantic")).toBe(true);
    expect(result.report.topics.backend).toBeGreaterThan(0);
    expect(result.duplicateCandidates[0]?.first.sourceUri).toMatch(/^file:/);
  });
});
