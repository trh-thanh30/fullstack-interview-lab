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

import { questionLevelEnum, questionTypeEnum, sessionModeEnum, sessionStateEnum } from "./enums";
import { questions, rubrics } from "./questions";
import { users } from "./identity";

export type SessionConfig = {
  topicIds?: string[];
  technologyIds?: string[];
  level?: (typeof questionLevelEnum.enumValues)[number];
  questionCount?: number;
  durationMinutes?: number;
};

export type EvaluationDimensions = Record<string, number>;

export const interviewSessions = pgTable(
  "interview_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: sessionModeEnum("mode").notNull(),
    state: sessionStateEnum("state").default("setup").notNull(),
    config: jsonb("config").$type<SessionConfig>().default({}).notNull(),
    currentPosition: integer("current_position").default(0).notNull(),
    startedAt: timestamp("started_at", { mode: "date", withTimezone: true }),
    completedAt: timestamp("completed_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("interview_sessions_user_created_at_idx").on(table.userId, table.createdAt),
    index("interview_sessions_user_state_idx").on(table.userId, table.state),
  ],
);

export const sessionQuestions = pgTable(
  "session_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => interviewSessions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").references(() => questions.id, { onDelete: "set null" }),
    position: integer("position").notNull(),
    questionType: questionTypeEnum("question_type").notNull(),
    promptSnapshot: text("prompt_snapshot").notNull(),
    choicesSnapshot: jsonb("choices_snapshot")
      .$type<Array<{ id: string; content: string; position: number }>>()
      .default([])
      .notNull(),
    rubricSnapshot: jsonb("rubric_snapshot").$type<Record<string, unknown> | null>(),
    askedAt: timestamp("asked_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("session_questions_session_position_unique").on(table.sessionId, table.position),
    index("session_questions_question_id_idx").on(table.questionId),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionQuestionId: uuid("session_question_id")
      .notNull()
      .references(() => sessionQuestions.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").default(1).notNull(),
    answerText: text("answer_text"),
    selectedChoiceIds: jsonb("selected_choice_ids").$type<string[]>().default([]).notNull(),
    submittedAt: timestamp("submitted_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("answers_session_question_attempt_unique").on(
      table.sessionQuestionId,
      table.attemptNumber,
    ),
  ],
);

export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    answerId: uuid("answer_id")
      .notNull()
      .references(() => answers.id, { onDelete: "cascade" }),
    rubricId: uuid("rubric_id").references(() => rubrics.id, { onDelete: "set null" }),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    score: numeric("score", { mode: "number", precision: 5, scale: 2 }).notNull(),
    dimensions: jsonb("dimensions").$type<EvaluationDimensions>().default({}).notNull(),
    strengths: jsonb("strengths").$type<string[]>().default([]).notNull(),
    missingPoints: jsonb("missing_points").$type<string[]>().default([]).notNull(),
    incorrectClaims: jsonb("incorrect_claims").$type<string[]>().default([]).notNull(),
    suggestedAnswer: text("suggested_answer"),
    followUpQuestion: text("follow_up_question"),
    sourceChunkIds: jsonb("source_chunk_ids").$type<string[]>().default([]).notNull(),
    latencyMs: integer("latency_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("evaluations_answer_created_at_idx").on(table.answerId, table.createdAt)],
);
