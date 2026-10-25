import { asc, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { sources } from "@/db/schema";

import type {
  SourceRecord,
  SourceRegistryStore,
  SourceStatus,
  ValidatedSourceInput,
} from "./source-registry";

export class DrizzleSourceRegistryStore implements SourceRegistryStore {
  constructor(private readonly database: Database) {}

  async findByUri(uri: string) {
    const [source] = await this.database.select().from(sources).where(eq(sources.uri, uri)).limit(1);

    return source ?? null;
  }

  async findByChecksum(checksum: string) {
    const [source] = await this.database
      .select()
      .from(sources)
      .where(eq(sources.checksum, checksum))
      .limit(1);

    return source ?? null;
  }

  async create(input: ValidatedSourceInput, now: Date) {
    const [source] = await this.database
      .insert(sources)
      .values({
        ...input,
        licenseNote: input.licenseNote ?? null,
        metadata: input.metadata ?? {},
        importedAt: input.importedAt ?? null,
        lastReviewedAt: input.lastReviewedAt ?? null,
        status: "new",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return requireSource(source);
  }

  async refreshMetadata(id: string, input: ValidatedSourceInput, now: Date) {
    const [source] = await this.database
      .update(sources)
      .set({
        type: input.type,
        title: input.title,
        licenseNote: input.licenseNote ?? null,
        metadata: input.metadata ?? {},
        lastReviewedAt: input.lastReviewedAt,
        updatedAt: now,
      })
      .where(eq(sources.id, id))
      .returning();

    return requireSource(source);
  }

  async replaceChangedSource(id: string, input: ValidatedSourceInput, now: Date) {
    const [source] = await this.database
      .update(sources)
      .set({
        type: input.type,
        status: "outdated",
        title: input.title,
        uri: input.uri,
        checksum: input.checksum,
        licenseNote: input.licenseNote ?? null,
        metadata: input.metadata ?? {},
        lastReviewedAt: input.lastReviewedAt,
        updatedAt: now,
      })
      .where(eq(sources.id, id))
      .returning();

    return requireSource(source);
  }

  async markOutdated(id: string, now: Date) {
    const [source] = await this.database
      .update(sources)
      .set({ status: "outdated", updatedAt: now })
      .where(eq(sources.id, id))
      .returning();

    return requireSource(source);
  }

  async list(status?: SourceStatus): Promise<SourceRecord[]> {
    if (status) {
      return this.database
        .select()
        .from(sources)
        .where(eq(sources.status, status))
        .orderBy(asc(sources.status), asc(sources.title));
    }

    return this.database.select().from(sources).orderBy(asc(sources.status), asc(sources.title));
  }
}

function requireSource(source: SourceRecord | undefined) {
  if (!source) {
    throw new Error("Source registry write did not return a source record.");
  }

  return source;
}
