// @vitest-environment node

import { createHash, randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  registerSource,
  type SourceRecord,
  type SourceRegistryStore,
  type SourceStatus,
  type ValidatedSourceInput,
} from "../source-registry";

class InMemorySourceStore implements SourceRegistryStore {
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
      licenseNote: input.licenseNote ?? null,
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

  private update(id: string, patch: Partial<SourceRecord>) {
    const source = this.records.find((candidate) => candidate.id === id);

    if (!source) {
      throw new Error("Source not found.");
    }

    Object.assign(source, patch);
    return source;
  }
}

describe("source registry", () => {
  it("does not create another source when the checksum already exists", async () => {
    const store = new InMemorySourceStore();
    const checksum = hash("same content");

    await registerSource(store, sourceInput("file:///first.md", checksum));
    const result = await registerSource(store, sourceInput("file:///copy.md", checksum));

    expect(result.action).toBe("duplicate");
    expect(store.records).toHaveLength(1);
  });

  it("keeps an unchanged URI idempotent", async () => {
    const store = new InMemorySourceStore();
    const input = sourceInput("file:///source.md", hash("stable"));

    const first = await registerSource(store, input);
    const second = await registerSource(store, { ...input, title: "Updated title" });

    expect(second.action).toBe("unchanged");
    expect(second.source.id).toBe(first.source.id);
    expect(second.source.title).toBe("Updated title");
    expect(store.records).toHaveLength(1);
  });

  it("marks a source outdated when content at its URI changes", async () => {
    const store = new InMemorySourceStore();
    const uri = "file:///source.md";

    const first = await registerSource(store, sourceInput(uri, hash("version one")));
    const second = await registerSource(store, sourceInput(uri, hash("version two")));

    expect(second.action).toBe("outdated");
    expect(second.source.id).toBe(first.source.id);
    expect(second.source.status).toBe("outdated");
    expect(second.source.checksum).toBe(hash("version two"));
  });

  it("validates SHA-256 checksums", async () => {
    const store = new InMemorySourceStore();

    await expect(registerSource(store, sourceInput("manual://invalid", "invalid"))).rejects.toThrow(
      /SHA-256/,
    );
  });
});

function sourceInput(uri: string, checksum: string) {
  return {
    type: "markdown" as const,
    title: "Source",
    uri,
    checksum,
    licenseNote: "Internal use; license review pending.",
  };
}

function hash(content: string) {
  return createHash("sha256").update(content).digest("hex");
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
