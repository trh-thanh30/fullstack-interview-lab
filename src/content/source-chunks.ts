import type { SourceMetadata } from "@/db/schema";

export type SourceChunkDraft = {
  position: number;
  pageNumber: number | null;
  heading: string | null;
  content: string;
  checksum: string;
  metadata: SourceMetadata;
};

export interface SourceChunkStore {
  replaceSourceChunks(
    sourceId: string,
    chunks: SourceChunkDraft[],
    importedAt: Date,
  ): Promise<void>;
  markSourceFailed(sourceId: string, errorMessage: string, failedAt: Date): Promise<void>;
}
