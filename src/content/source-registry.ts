import { z } from "zod";

import type { SourceMetadata } from "@/db/schema";
import { sourceStatusValues, sourceTypeValues } from "@/db/schema";

export type SourceType = (typeof sourceTypeValues)[number];
export type SourceStatus = (typeof sourceStatusValues)[number];

export type SourceRecord = {
  id: string;
  type: SourceType;
  status: SourceStatus;
  title: string;
  uri: string;
  checksum: string;
  licenseNote: string | null;
  metadata: SourceMetadata;
  importedAt: Date | null;
  lastReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const sourceMetadataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

const registerSourceSchema = z.object({
  type: z.enum(sourceTypeValues),
  title: z.string().trim().min(1),
  uri: z.string().trim().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i, "Checksum must be a SHA-256 hex digest."),
  licenseNote: z.string().trim().min(1).nullable().optional(),
  metadata: sourceMetadataSchema.optional(),
  importedAt: z.date().nullable().optional(),
  lastReviewedAt: z.date().nullable().optional(),
});

export type RegisterSourceInput = z.input<typeof registerSourceSchema>;
export type ValidatedSourceInput = z.output<typeof registerSourceSchema>;

export type SourceRegistrationResult =
  | { action: "created"; source: SourceRecord }
  | { action: "unchanged"; source: SourceRecord }
  | { action: "outdated"; source: SourceRecord }
  | { action: "duplicate"; source: SourceRecord };

export interface SourceRegistryStore {
  findByUri(uri: string): Promise<SourceRecord | null>;
  findByChecksum(checksum: string): Promise<SourceRecord | null>;
  create(input: ValidatedSourceInput, now: Date): Promise<SourceRecord>;
  refreshMetadata(
    id: string,
    input: ValidatedSourceInput,
    now: Date,
  ): Promise<SourceRecord>;
  replaceChangedSource(
    id: string,
    input: ValidatedSourceInput,
    now: Date,
  ): Promise<SourceRecord>;
  markOutdated(id: string, now: Date): Promise<SourceRecord>;
  list(status?: SourceStatus): Promise<SourceRecord[]>;
}

export async function registerSource(
  store: SourceRegistryStore,
  rawInput: RegisterSourceInput,
  now = new Date(),
): Promise<SourceRegistrationResult> {
  const input = registerSourceSchema.parse(rawInput);
  const sourceAtUri = await store.findByUri(input.uri);

  if (sourceAtUri?.checksum === input.checksum) {
    const refreshedSource = await store.refreshMetadata(sourceAtUri.id, input, now);

    return { action: "unchanged", source: refreshedSource };
  }

  const sourceWithChecksum = await store.findByChecksum(input.checksum);

  if (sourceWithChecksum) {
    if (sourceAtUri) {
      await store.markOutdated(sourceAtUri.id, now);
    }

    return { action: "duplicate", source: sourceWithChecksum };
  }

  if (sourceAtUri) {
    const outdatedSource = await store.replaceChangedSource(sourceAtUri.id, input, now);

    return { action: "outdated", source: outdatedSource };
  }

  const source = await store.create(input, now);

  return { action: "created", source };
}

export function parseSourceStatus(value: string | undefined): SourceStatus | undefined {
  if (!value) {
    return undefined;
  }

  const result = z.enum(sourceStatusValues).safeParse(value);

  if (!result.success) {
    throw new Error(
      `Invalid source status: ${value}. Expected one of: ${sourceStatusValues.join(", ")}.`,
    );
  }

  return result.data;
}
