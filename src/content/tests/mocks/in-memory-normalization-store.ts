import type { ChunkClassification } from "../../content-taxonomy";
import type {
  ChunkEmbedding,
  DuplicateCandidate,
  NormalizationChunk,
  SourceNormalizationStore,
} from "../../source-normalization";

export class InMemoryNormalizationStore implements SourceNormalizationStore {
  classifications: ChunkClassification[] = [];
  embeddings: ChunkEmbedding[] = [];
  candidates: DuplicateCandidate[] = [];

  constructor(readonly chunks: NormalizationChunk[]) {}

  async listChunks() {
    return structuredClone(this.chunks);
  }

  async saveClassifications(classifications: ChunkClassification[]) {
    this.classifications = structuredClone(classifications);
  }

  async saveEmbeddings(embeddings: ChunkEmbedding[]) {
    this.embeddings.push(...structuredClone(embeddings));
  }

  async saveDuplicateCandidates(candidates: DuplicateCandidate[]) {
    this.candidates = structuredClone(candidates);
  }
}
