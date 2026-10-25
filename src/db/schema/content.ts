import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

import { sourceStatusEnum, sourceTypeEnum } from "./enums";

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
    position: integer("position").notNull(),
    pageNumber: integer("page_number"),
    heading: text("heading"),
    content: text("content").notNull(),
    checksum: text("checksum").notNull(),
    metadata: jsonb("metadata").$type<SourceMetadata>().default({}).notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("source_chunks_source_position_unique").on(table.sourceId, table.position),
    uniqueIndex("source_chunks_source_checksum_unique").on(table.sourceId, table.checksum),
    index("source_chunks_source_id_idx").on(table.sourceId),
    index("source_chunks_embedding_hnsw_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .where(sql`${table.embedding} IS NOT NULL`),
  ],
);
