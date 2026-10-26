// @vitest-environment node

import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  importMarkdownBatch,
  importMarkdownFile,
  type SourceChunkStore,
} from "../markdown-importer";
import type { MarkdownChunk } from "../markdown-parser";
import type {
  SourceRecord,
  SourceRegistryStore,
  SourceStatus,
  ValidatedSourceInput,
} from "../source-registry";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("Markdown importer", () => {
  it("is idempotent when importing the same file twice", async () => {
    const path = await createMarkdownFile("# React\n\n## Hooks\n\nUse hooks.");
    const registry = new InMemoryRegistry();
    const chunks = new InMemoryChunkStore(registry);

    const first = await importMarkdownFile({ path, registry, chunks });
    const second = await importMarkdownFile({ path, registry, chunks });

    expect(first.action).toBe("imported");
    expect(second.action).toBe("skipped");
    expect(chunks.replacementCount).toBe(1);
    expect(chunks.records.get(first.source.id)).toHaveLength(first.chunkCount);
  });

  it("replaces chunks and processes a source again when its file changes", async () => {
    const path = await createMarkdownFile("# Node.js\n\nVersion one.");
    const registry = new InMemoryRegistry();
    const chunks = new InMemoryChunkStore(registry);

    const first = await importMarkdownFile({ path, registry, chunks });
    await writeFile(path, "# Node.js\n\n## Event loop\n\nVersion two.");
    const second = await importMarkdownFile({ path, registry, chunks });

    expect(second.action).toBe("imported");
    expect(second.source.id).toBe(first.source.id);
    expect(second.chunkCount).toBe(2);
    expect(chunks.records.get(first.source.id)).toHaveLength(2);
    expect(registry.records[0]?.status).toBe("processed");
  });

  it("records one file failure and continues the batch", async () => {
    const emptyPath = await createMarkdownFile("   ");
    const validPath = await createMarkdownFile("# Docker\n\nContainers.");
    const registry = new InMemoryRegistry();
    const chunks = new InMemoryChunkStore(registry);

    const result = await importMarkdownBatch({
      paths: [emptyPath, validPath],
      registry,
      chunks,
    });

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.path).toBe(emptyPath);
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]?.path).toBe(validPath);
    expect(registry.records.find((source) => source.status === "failed")).toBeDefined();
  });
});

class InMemoryRegistry implements SourceRegistryStore {
  records: SourceRecord[] = [];

  async findByUri(uri: string) {
    return this.records.find((source) => source.uri === uri) ?? null;
  }

  async findByChecksum(checksum: string) {
    return this.records.find((source) => source.checksum === checksum) ?? null;
  }

  async create(input: ValidatedSourceInput, now: Date) {
    const source = createRecord(input, now);
    this.records.push(source);
    return source;
  }

  async refreshMetadata(id: string, input: ValidatedSourceInput, now: Date) {
    return this.update(id, {
      type: input.type,
      title: input.title,
      metadata: input.metadata ?? {},
      updatedAt: now,
    });
  }

  async replaceChangedSource(id: string, input: ValidatedSourceInput, now: Date) {
    return this.update(id, {
      ...input,
      licenseNote: input.licenseNote ?? null,
      metadata: input.metadata ?? {},
      status: "outdated",
      updatedAt: now,
    });
  }

  async markOutdated(id: string, now: Date) {
    return this.update(id, { status: "outdated", updatedAt: now });
  }

  async list(status?: SourceStatus) {
    return status ? this.records.filter((source) => source.status === status) : this.records;
  }

  update(id: string, patch: Partial<SourceRecord>) {
    const source = this.records.find((candidate) => candidate.id === id);
    if (!source) throw new Error("Source not found.");
    Object.assign(source, patch);
    return source;
  }
}

class InMemoryChunkStore implements SourceChunkStore {
  records = new Map<string, MarkdownChunk[]>();
  replacementCount = 0;

  constructor(private readonly registry: InMemoryRegistry) {}

  async replaceSourceChunks(sourceId: string, chunks: MarkdownChunk[], importedAt: Date) {
    this.records.set(sourceId, structuredClone(chunks));
    this.replacementCount += 1;
    this.registry.update(sourceId, {
      status: "processed",
      importedAt,
      updatedAt: importedAt,
    });
  }

  async markSourceFailed(sourceId: string, errorMessage: string, failedAt: Date) {
    this.registry.update(sourceId, {
      status: "failed",
      metadata: { importError: errorMessage },
      updatedAt: failedAt,
    });
  }
}

async function createMarkdownFile(content: string) {
  const directory = await mkdtemp(join(tmpdir(), "markdown-import-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "README.md");
  await writeFile(path, content);
  return path;
}

function createRecord(input: ValidatedSourceInput, now: Date): SourceRecord {
  return {
    id: randomUUID(),
    type: input.type,
    status: "new",
    title: input.title,
    uri: input.uri,
    checksum: input.checksum,
    licenseNote: input.licenseNote ?? null,
    metadata: input.metadata ?? {},
    importedAt: input.importedAt ?? null,
    lastReviewedAt: input.lastReviewedAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
