import { readFile } from "node:fs/promises";

import { createFileSourceInput } from "./file-sources";
import { parseMarkdownIntoChunks } from "./markdown-parser";
import {
  registerSource,
  type SourceRecord,
  type SourceRegistryStore,
} from "./source-registry";
import type { SourceChunkStore } from "./source-chunks";

export type { SourceChunkStore } from "./source-chunks";

export type MarkdownImportResult =
  | { action: "imported"; path: string; source: SourceRecord; chunkCount: number }
  | { action: "skipped"; path: string; source: SourceRecord; chunkCount: number };

export type MarkdownBatchResult = {
  imported: MarkdownImportResult[];
  failed: Array<{ path: string; error: string }>;
};

export async function importMarkdownFile({
  path,
  registry,
  chunks,
  licenseNote,
  now = new Date(),
}: {
  path: string;
  registry: SourceRegistryStore;
  chunks: SourceChunkStore;
  licenseNote?: string;
  now?: Date;
}): Promise<MarkdownImportResult> {
  const registration = await registerSource(
    registry,
    await createFileSourceInput(path, licenseNote),
    now,
  );
  const source = registration.source;

  if (registration.action === "unchanged" && source.status === "processed") {
    return { action: "skipped", path, source, chunkCount: 0 };
  }

  try {
    const markdown = await readFile(path, "utf8");
    const parsedChunks = parseMarkdownIntoChunks(markdown, { filePath: path });

    if (parsedChunks.length === 0) {
      throw new Error("Markdown file does not contain importable content.");
    }

    await chunks.replaceSourceChunks(source.id, parsedChunks, now);

    return {
      action: "imported",
      path,
      source: { ...source, status: "processed", importedAt: now, updatedAt: now },
      chunkCount: parsedChunks.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await chunks.markSourceFailed(source.id, message, now);
    throw error;
  }
}

export async function importMarkdownBatch({
  paths,
  registry,
  chunks,
  licenseNote,
  now = new Date(),
}: {
  paths: string[];
  registry: SourceRegistryStore;
  chunks: SourceChunkStore;
  licenseNote?: string;
  now?: Date;
}): Promise<MarkdownBatchResult> {
  const result: MarkdownBatchResult = { imported: [], failed: [] };

  for (const path of paths) {
    try {
      result.imported.push(
        await importMarkdownFile({ path, registry, chunks, licenseNote, now }),
      );
    } catch (error) {
      result.failed.push({
        path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
