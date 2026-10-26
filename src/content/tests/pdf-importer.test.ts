// @vitest-environment node

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { importPdfBatch, importPdfFile } from "../pdf-importer";
import {
  InMemoryIngestionRegistry,
  InMemorySourceChunkStore,
} from "./mocks/in-memory-ingestion-stores";

const temporaryDirectories: string[] = [];
const extractedPdf = "Architecture\n\nA sufficiently detailed paragraph about application architecture.";

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("PDF importer", () => {
  it("does not extract or replace chunks again when checksum is unchanged", async () => {
    const path = await createPdfFile("stable pdf bytes");
    const registry = new InMemoryIngestionRegistry();
    const chunks = new InMemorySourceChunkStore(registry);
    let extractionCount = 0;
    const extractText = async () => {
      extractionCount += 1;
      return extractedPdf;
    };

    const first = await importPdfFile({ path, registry, chunks, extractText });
    const second = await importPdfFile({ path, registry, chunks, extractText });

    expect(first.action).toBe("imported");
    expect(second.action).toBe("skipped");
    expect(extractionCount).toBe(1);
    expect(chunks.replacementCount).toBe(1);
  });

  it("isolates extraction errors and continues the PDF batch", async () => {
    const failedPath = await createPdfFile("broken");
    const validPath = await createPdfFile("valid");
    const registry = new InMemoryIngestionRegistry();
    const chunks = new InMemorySourceChunkStore(registry);
    const extractText = async (path: string) => {
      if (path === failedPath) throw new Error("synthetic pdftotext failure");
      return extractedPdf;
    };

    const result = await importPdfBatch({
      paths: [failedPath, validPath],
      registry,
      chunks,
      extractText,
    });

    expect(result.failed).toEqual([
      { path: failedPath, error: "synthetic pdftotext failure" },
    ]);
    expect(result.imported).toHaveLength(1);
    expect(registry.records.find((source) => source.status === "failed")).toBeDefined();
  });
});

async function createPdfFile(content: string) {
  const directory = await mkdtemp(join(tmpdir(), "pdf-import-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "book.pdf");
  await writeFile(path, content);
  return path;
}
