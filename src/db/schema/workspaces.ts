import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { questionLevelEnum } from "./enums";
import { questions } from "./questions";
import { interviewSessions } from "./sessions";

export type SystemDesignRubricDimension = {
  key: "requirements" | "estimation" | "architecture" | "data" | "scaling" | "reliability" | "security";
  label: string;
  description: string;
  weight: number;
};

export const systemDesignProblems = pgTable(
  "system_design_problems",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    level: questionLevelEnum("level").notNull(),
    context: text("context").notNull(),
    functionalRequirements: jsonb("functional_requirements").$type<string[]>().default([]).notNull(),
    nonFunctionalRequirements: jsonb("non_functional_requirements").$type<string[]>().default([]).notNull(),
    constraints: jsonb("constraints").$type<string[]>().default([]).notNull(),
    rubric: jsonb("rubric").$type<SystemDesignRubricDimension[]>().notNull(),
    reviewedAt: timestamp("reviewed_at", { mode: "date", withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("system_design_problems_slug_unique").on(table.slug)],
);

export const systemDesignCheckpointResponses = pgTable(
  "system_design_checkpoint_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => interviewSessions.id, { onDelete: "cascade" }),
    checkpoint: text("checkpoint").notNull(),
    notes: text("notes").default("").notNull(),
    version: integer("version").default(1).notNull(),
    savedAt: timestamp("saved_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("system_design_responses_session_checkpoint_unique").on(table.sessionId, table.checkpoint),
    index("system_design_responses_session_idx").on(table.sessionId),
  ],
);

export const systemDesignReviews = pgTable(
  "system_design_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    responseId: uuid("response_id").notNull().references(() => systemDesignCheckpointResponses.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    score: numeric("score", { mode: "number", precision: 5, scale: 2 }).notNull(),
    dimensionScores: jsonb("dimension_scores").$type<Record<string, number>>().default({}).notNull(),
    strengths: jsonb("strengths").$type<string[]>().default([]).notNull(),
    gaps: jsonb("gaps").$type<string[]>().default([]).notNull(),
    assumptions: jsonb("assumptions").$type<string[]>().default([]).notNull(),
    tradeoffs: jsonb("tradeoffs").$type<string[]>().default([]).notNull(),
    nextQuestions: jsonb("next_questions").$type<string[]>().default([]).notNull(),
    summary: text("summary").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    providerResponseId: text("provider_response_id"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("system_design_reviews_response_created_idx").on(table.responseId, table.createdAt)],
);

export const designAttachments = pgTable(
  "design_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => interviewSessions.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    filename: text("filename"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    blobUrl: text("blob_url"),
    blobPathname: text("blob_pathname"),
    mermaidText: text("mermaid_text"),
    altText: text("alt_text").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("design_attachments_session_created_idx").on(table.sessionId, table.createdAt)],
);

export const codingDrafts = pgTable(
  "coding_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => interviewSessions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").references(() => questions.id, { onDelete: "set null" }),
    language: text("language").default("typescript").notNull(),
    code: text("code").default("").notNull(),
    explanation: text("explanation").default("").notNull(),
    savedAt: timestamp("saved_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("coding_drafts_session_unique").on(table.sessionId)],
);

export const codingReviews = pgTable(
  "coding_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    draftId: uuid("draft_id").notNull().references(() => codingDrafts.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    codeSnapshot: text("code_snapshot").notNull(),
    explanationSnapshot: text("explanation_snapshot").notNull(),
    executionStatus: text("execution_status").default("not_run").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    score: numeric("score", { mode: "number", precision: 5, scale: 2 }).notNull(),
    complexity: text("complexity").notNull(),
    correctnessAssumptions: jsonb("correctness_assumptions").$type<string[]>().default([]).notNull(),
    edgeCases: jsonb("edge_cases").$type<string[]>().default([]).notNull(),
    strengths: jsonb("strengths").$type<string[]>().default([]).notNull(),
    risks: jsonb("risks").$type<string[]>().default([]).notNull(),
    suggestions: jsonb("suggestions").$type<string[]>().default([]).notNull(),
    summary: text("summary").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    providerResponseId: text("provider_response_id"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("coding_reviews_draft_created_idx").on(table.draftId, table.createdAt)],
);
