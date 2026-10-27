import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  questionLevelEnum,
  questionReviewActionEnum,
  questionStatusEnum,
  questionTypeEnum,
} from "./enums";
import { sourceChunks, technologies, topics } from "./content";
import { users } from "./identity";

export type RubricDimension = {
  key: string;
  label: string;
  description: string;
  weight: number;
};

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    type: questionTypeEnum("type").notNull(),
    level: questionLevelEnum("level").notNull(),
    status: questionStatusEnum("status").default("draft").notNull(),
    prompt: text("prompt").notNull(),
    explanation: text("explanation"),
    isManual: boolean("is_manual").default(false).notNull(),
    version: integer("version").default(1).notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    lastReviewedAt: timestamp("last_reviewed_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("questions_topic_status_idx").on(table.topicId, table.status),
    index("questions_type_level_idx").on(table.type, table.level),
  ],
);

export const questionChoices = pgTable(
  "question_choices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isCorrect: boolean("is_correct").default(false).notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("question_choices_question_position_unique").on(
      table.questionId,
      table.position,
    ),
    index("question_choices_question_id_idx").on(table.questionId),
  ],
);

export const rubrics = pgTable(
  "rubrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    version: integer("version").default(1).notNull(),
    dimensions: jsonb("dimensions").$type<RubricDimension[]>().notNull(),
    referenceAnswer: text("reference_answer"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("rubrics_question_version_unique").on(table.questionId, table.version),
  ],
);

export const questionTechnologies = pgTable(
  "question_technologies",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    technologyId: uuid("technology_id")
      .notNull()
      .references(() => technologies.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({
      name: "question_technologies_pk",
      columns: [table.questionId, table.technologyId],
    }),
    index("question_technologies_technology_id_idx").on(table.technologyId),
  ],
);

export const questionSources = pgTable(
  "question_sources",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    sourceChunkId: uuid("source_chunk_id")
      .notNull()
      .references(() => sourceChunks.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
  },
  (table) => [
    primaryKey({
      name: "question_sources_pk",
      columns: [table.questionId, table.sourceChunkId],
    }),
    index("question_sources_source_chunk_id_idx").on(table.sourceChunkId),
  ],
);

export const questionGenerationRuns = pgTable(
  "question_generation_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    providerResponseId: text("provider_response_id").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("question_generation_runs_question_id_unique").on(table.questionId),
    index("question_generation_runs_model_created_at_idx").on(table.model, table.createdAt),
  ],
);

export const questionReviewEvents = pgTable(
  "question_review_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: questionReviewActionEnum("action").notNull(),
    previousStatus: questionStatusEnum("previous_status").notNull(),
    newStatus: questionStatusEnum("new_status").notNull(),
    reason: text("reason"),
    mergedIntoQuestionId: uuid("merged_into_question_id")
      .references(() => questions.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("question_review_events_question_created_at_idx").on(
      table.questionId,
      table.createdAt,
    ),
    index("question_review_events_reviewer_created_at_idx").on(
      table.reviewerUserId,
      table.createdAt,
    ),
    index("question_review_events_merged_into_idx").on(table.mergedIntoQuestionId),
  ],
);
