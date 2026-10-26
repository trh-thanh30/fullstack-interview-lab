import { createFileSourceInput } from "./file-sources";
import { parsePdfTextIntoChunks } from "./pdf-parser";
import { extractPdfText } from "./pdf-text-extractor";
import {
  registerSource,
  type SourceRecord,
  type SourceRegistryStore,
} from "./source-registry";
import type { SourceChunkStore } from "./source-chunks";

export type PdfImportResult =
  | { action: "imported"; path: string; source: SourceRecord; chunkCount: number; reviewCount: number }
  | { action: "skipped"; path: string; source: SourceRecord; chunkCount: number; reviewCount: number };

export async function importPdfFile({
  path,
  registry,
  chunks,
  licenseNote,
  now = new Date(),
  extractText = extractPdfText,
}: {
  path: string;
  registry: SourceRegistryStore;
  chunks: SourceChunkStore;
  licenseNote?: string;
  now?: Date;
  extractText?: (path: string) => Promise<string>;
}): Promise<PdfImportResult> {
  const registration = await registerSource(
    registry,
    await createFileSourceInput(path, licenseNote),
    now,
  );
  const source = registration.source;

  if (registration.action === "unchanged" && source.status === "processed") {
    return { action: "skipped", path, source, chunkCount: 0, reviewCount: 0 };
  }

  try {
    const parsedChunks = parsePdfTextIntoChunks(await extractText(path), path);

    if (parsedChunks.length === 0) {
      throw new Error("PDF does not contain importable text.");
    }

    await chunks.replaceSourceChunks(source.id, parsedChunks, now);
    const reviewCount = parsedChunks.filter(
      (chunk) => chunk.metadata.reviewRequired === true,
    ).length;

    return {
      action: "imported",
      path,
      source: { ...source, status: "processed", importedAt: now, updatedAt: now },
      chunkCount: parsedChunks.length,
      reviewCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await chunks.markSourceFailed(source.id, message, now);
    throw error;
  }
}

export async function importPdfBatch({
  paths,
  registry,
  chunks,
  licenseNote,
  extractText = extractPdfText,
  now = new Date(),
}: {
  paths: string[];
  registry: SourceRegistryStore;
  chunks: SourceChunkStore;
  licenseNote?: string;
  extractText?: (path: string) => Promise<string>;
  now?: Date;
}) {
  const imported: PdfImportResult[] = [];
  const failed: Array<{ path: string; error: string }> = [];

  for (const path of paths) {
    try {
      imported.push(
        await importPdfFile({ path, registry, chunks, licenseNote, extractText, now }),
      );
    } catch (error) {
      failed.push({ path, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { imported, failed };
}
