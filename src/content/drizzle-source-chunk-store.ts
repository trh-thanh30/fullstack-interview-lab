import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { sourceChunks, sources } from "@/db/schema";

import type { SourceChunkStore } from "./markdown-importer";

export class DrizzleSourceChunkStore implements SourceChunkStore {
  constructor(private readonly database: Database) {}

  async replaceSourceChunks(
    sourceId: string,
    chunks: Parameters<SourceChunkStore["replaceSourceChunks"]>[1],
    importedAt: Date,
  ) {
    const [currentSource] = await this.database
      .select({ metadata: sources.metadata })
      .from(sources)
      .where(eq(sources.id, sourceId))
      .limit(1);
    const metadata = { ...(currentSource?.metadata ?? {}) };
    delete metadata.importError;
    delete metadata.importFailedAt;

    const deleteChunks = this.database
      .delete(sourceChunks)
      .where(eq(sourceChunks.sourceId, sourceId));
    const updateSource = this.database
      .update(sources)
      .set({
        status: "processed",
        importedAt,
        updatedAt: importedAt,
        metadata,
      })
      .where(eq(sources.id, sourceId));

    const insertChunks = this.database.insert(sourceChunks).values(
      chunks.map((chunk) => ({
        sourceId,
        position: chunk.position,
        heading: chunk.heading,
        content: chunk.content,
        checksum: chunk.checksum,
        metadata: chunk.metadata,
      })),
    );

    await this.database.batch([deleteChunks, insertChunks, updateSource]);
  }

  async markSourceFailed(sourceId: string, errorMessage: string, failedAt: Date) {
    const [source] = await this.database
      .select({ metadata: sources.metadata })
      .from(sources)
      .where(eq(sources.id, sourceId))
      .limit(1);

    await this.database
      .update(sources)
      .set({
        status: "failed",
        updatedAt: failedAt,
        metadata: {
          ...(source?.metadata ?? {}),
          importError: errorMessage.slice(0, 1_000),
          importFailedAt: failedAt.toISOString(),
        },
      })
      .where(eq(sources.id, sourceId));
  }
}
