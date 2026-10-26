import { randomUUID } from "node:crypto";

import type {
  SourceRecord,
  SourceRegistryStore,
  SourceStatus,
  ValidatedSourceInput,
} from "../../source-registry";
import type { SourceChunkDraft, SourceChunkStore } from "../../source-chunks";

export class InMemoryIngestionRegistry implements SourceRegistryStore {
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

export class InMemorySourceChunkStore implements SourceChunkStore {
  records = new Map<string, SourceChunkDraft[]>();
  replacementCount = 0;

  constructor(private readonly registry: InMemoryIngestionRegistry) {}

  async replaceSourceChunks(sourceId: string, chunks: SourceChunkDraft[], importedAt: Date) {
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
