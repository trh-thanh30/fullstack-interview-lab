import { buildEmbeddingInput, type EmbeddingProvider } from "./embedding-provider";
import { classifySourceChunk, type ChunkClassification } from "./content-taxonomy";

export type NormalizationChunk = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceUri: string;
  heading: string | null;
  content: string;
  checksum: string;
  embedding: number[] | null;
  embeddingModel: string | null;
};

export type ChunkEmbedding = {
  chunkId: string;
  embedding: number[];
  model: string;
};

export type DuplicateCandidate = {
  firstChunkId: string;
  secondChunkId: string;
  kind: "exact" | "semantic";
  similarity: number;
};

export type DuplicateCandidatePreview = DuplicateCandidate & {
  first: Pick<NormalizationChunk, "sourceTitle" | "sourceUri" | "heading">;
  second: Pick<NormalizationChunk, "sourceTitle" | "sourceUri" | "heading">;
};

export type TaxonomyReport = {
  topics: Record<string, number>;
  technologies: Record<string, number>;
  levels: Record<string, number>;
  contentTypes: Record<string, number>;
};

export interface SourceNormalizationStore {
  listChunks(): Promise<NormalizationChunk[]>;
  saveClassifications(classifications: ChunkClassification[], classifiedAt: Date): Promise<void>;
  saveEmbeddings(embeddings: ChunkEmbedding[], embeddedAt: Date): Promise<void>;
  saveDuplicateCandidates(candidates: DuplicateCandidate[], detectedAt: Date): Promise<void>;
}

export async function normalizeSourceContent(options: {
  store: SourceNormalizationStore;
  embedder: EmbeddingProvider;
  semanticThreshold?: number;
  embeddingBatchSize?: number;
  now?: Date;
}) {
  const chunks = await options.store.listChunks();
  const now = options.now ?? new Date();
  const classifications = chunks.map(classifySourceChunk);
  await options.store.saveClassifications(classifications, now);

  const pendingEmbeddingChunks = chunks.filter(
    (chunk) => !chunk.embedding || chunk.embeddingModel !== options.embedder.model,
  );
  const generatedEmbeddings: ChunkEmbedding[] = [];
  const batchSize = options.embeddingBatchSize ?? 64;

  for (let offset = 0; offset < pendingEmbeddingChunks.length; offset += batchSize) {
    const batch = pendingEmbeddingChunks.slice(offset, offset + batchSize);
    const vectors = await options.embedder.embed(batch.map(buildEmbeddingInput), "document");
    const embeddings = batch.map((chunk, index) => ({
      chunkId: chunk.id,
      embedding: vectors[index]!,
      model: options.embedder.model,
    }));
    await options.store.saveEmbeddings(embeddings, now);
    generatedEmbeddings.push(...embeddings);
  }

  const generatedByChunkId = new Map(
    generatedEmbeddings.map((embedding) => [embedding.chunkId, embedding.embedding]),
  );
  const chunksWithCurrentEmbeddings = chunks.map((chunk) => ({
    ...chunk,
    embedding: generatedByChunkId.get(chunk.id) ?? chunk.embedding,
  }));
  const duplicates = findDuplicateCandidates(
    chunksWithCurrentEmbeddings,
    options.semanticThreshold ?? 0.92,
  );
  await options.store.saveDuplicateCandidates(duplicates, now);

  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const duplicateCandidates: DuplicateCandidatePreview[] = duplicates.map((candidate) => {
    const first = chunksById.get(candidate.firstChunkId)!;
    const second = chunksById.get(candidate.secondChunkId)!;

    return {
      ...candidate,
      first: {
        sourceTitle: first.sourceTitle,
        sourceUri: first.sourceUri,
        heading: first.heading,
      },
      second: {
        sourceTitle: second.sourceTitle,
        sourceUri: second.sourceUri,
        heading: second.heading,
      },
    };
  });

  return {
    chunkCount: chunks.length,
    embeddedCount: generatedEmbeddings.length,
    exactDuplicateCount: duplicates.filter((candidate) => candidate.kind === "exact").length,
    semanticDuplicateCount: duplicates.filter((candidate) => candidate.kind === "semantic").length,
    duplicateCandidates,
    report: buildTaxonomyReport(classifications),
  };
}

export function findDuplicateCandidates(chunks: NormalizationChunk[], semanticThreshold = 0.92) {
  const candidates: DuplicateCandidate[] = [];

  for (let leftIndex = 0; leftIndex < chunks.length; leftIndex += 1) {
    const left = chunks[leftIndex]!;

    for (let rightIndex = leftIndex + 1; rightIndex < chunks.length; rightIndex += 1) {
      const right = chunks[rightIndex]!;
      if (left.sourceId === right.sourceId) continue;

      const [firstChunkId, secondChunkId] = [left.id, right.id].sort();

      if (left.checksum === right.checksum) {
        candidates.push({ firstChunkId, secondChunkId, kind: "exact", similarity: 1 });
        continue;
      }

      if (!left.embedding || !right.embedding) continue;
      const similarity = cosineSimilarity(left.embedding, right.embedding);

      if (similarity >= semanticThreshold) {
        candidates.push({ firstChunkId, secondChunkId, kind: "semantic", similarity });
      }
    }
  }

  return candidates;
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length || left.length === 0) return 0;

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index]! * right[index]!;
    leftMagnitude += left[index]! ** 2;
    rightMagnitude += right[index]! ** 2;
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function buildTaxonomyReport(classifications: ChunkClassification[]): TaxonomyReport {
  const report: TaxonomyReport = { topics: {}, technologies: {}, levels: {}, contentTypes: {} };

  for (const classification of classifications) {
    increment(report.topics, classification.topicSlug);
    increment(report.levels, classification.level);
    increment(report.contentTypes, classification.contentType);
    for (const technology of classification.technologySlugs) {
      increment(report.technologies, technology);
    }
  }

  return report;
}

function increment(values: Record<string, number>, key: string) {
  values[key] = (values[key] ?? 0) + 1;
}
