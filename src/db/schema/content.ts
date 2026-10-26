import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
  primaryKey,
} from "drizzle-orm/pg-core";

import {
  duplicateKindEnum,
  duplicateReviewStatusEnum,
  questionLevelEnum,
  sourceContentTypeEnum,
  sourceStatusEnum,
  sourceTypeEnum,
} from "./enums";

export type SourceMetadata = Record<string, string | number | boolean | null>;

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id").references((): AnyPgColumn => topics.id, {
      onDelete: "restrict",
    }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("topics_slug_unique").on(table.slug),
    index("topics_parent_id_idx").on(table.parentId),
  ],
);

export const technologies = pgTable(
  "technologies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    primaryTopicId: uuid("primary_topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("technologies_slug_unique").on(table.slug),
    index("technologies_primary_topic_id_idx").on(table.primaryTopicId),
  ],
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: sourceTypeEnum("type").notNull(),
    status: sourceStatusEnum("status").default("new").notNull(),
    title: text("title").notNull(),
    uri: text("uri").notNull(),
    checksum: text("checksum").notNull(),
    licenseNote: text("license_note"),
    metadata: jsonb("metadata").$type<SourceMetadata>().default({}).notNull(),
    importedAt: timestamp("imported_at", { mode: "date", withTimezone: true }),
    lastReviewedAt: timestamp("last_reviewed_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("sources_uri_unique").on(table.uri),
    uniqueIndex("sources_checksum_unique").on(table.checksum),
    index("sources_status_idx").on(table.status),
  ],
);

export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    pageNumber: integer("page_number"),
    heading: text("heading"),
    content: text("content").notNull(),
    checksum: text("checksum").notNull(),
    metadata: jsonb("metadata").$type<SourceMetadata>().default({}).notNull(),
    level: questionLevelEnum("level"),
    contentType: sourceContentTypeEnum("content_type"),
    embedding: vector("embedding", { dimensions: 1536 }),
    embeddingModel: text("embedding_model"),
    embeddedAt: timestamp("embedded_at", { mode: "date", withTimezone: true }),
    classifiedAt: timestamp("classified_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("source_chunks_source_position_unique").on(table.sourceId, table.position),
    uniqueIndex("source_chunks_source_checksum_unique").on(table.sourceId, table.checksum),
    index("source_chunks_source_id_idx").on(table.sourceId),
    index("source_chunks_topic_id_idx").on(table.topicId),
    index("source_chunks_level_content_type_idx").on(table.level, table.contentType),
    index("source_chunks_embedding_hnsw_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .where(sql`${table.embedding} IS NOT NULL`),
  ],
);

export const sourceChunkTechnologies = pgTable(
  "source_chunk_technologies",
  {
    sourceChunkId: uuid("source_chunk_id")
      .notNull()
      .references(() => sourceChunks.id, { onDelete: "cascade" }),
    technologyId: uuid("technology_id")
      .notNull()
      .references(() => technologies.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({
      name: "source_chunk_technologies_pk",
      columns: [table.sourceChunkId, table.technologyId],
    }),
    index("source_chunk_technologies_technology_id_idx").on(table.technologyId),
  ],
);

export const sourceDuplicateCandidates = pgTable(
  "source_duplicate_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firstChunkId: uuid("first_chunk_id")
      .notNull()
      .references(() => sourceChunks.id, { onDelete: "cascade" }),
    secondChunkId: uuid("second_chunk_id")
      .notNull()
      .references(() => sourceChunks.id, { onDelete: "cascade" }),
    kind: duplicateKindEnum("kind").notNull(),
    similarity: doublePrecision("similarity").notNull(),
    status: duplicateReviewStatusEnum("status").default("pending").notNull(),
    firstDetectedAt: timestamp("first_detected_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    lastDetectedAt: timestamp("last_detected_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("source_duplicate_candidates_pair_kind_unique").on(
      table.firstChunkId,
      table.secondChunkId,
      table.kind,
    ),
    index("source_duplicate_candidates_status_idx").on(table.status),
    index("source_duplicate_candidates_second_chunk_id_idx").on(table.secondChunkId),
  ],
);
