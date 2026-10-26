import { pgEnum } from "drizzle-orm/pg-core";

export const questionTypeValues = [
  "mcq",
  "short_answer",
  "deep_dive",
  "system_design",
  "coding",
] as const;

export const questionLevelValues = ["junior", "middle", "senior"] as const;

export const questionStatusValues = [
  "draft",
  "reviewed",
  "published",
  "outdated",
  "archived",
] as const;

export const sessionModeValues = [
  "mcq",
  "short_answer",
  "mock_interview",
  "system_design",
  "coding",
] as const;

export const sessionStateValues = [
  "setup",
  "asking",
  "answering",
  "follow_up",
  "evaluating",
  "summary",
  "completed",
  "abandoned",
] as const;

export const sourceTypeValues = ["markdown", "pdf", "url", "manual"] as const;
export const sourceStatusValues = ["new", "processed", "failed", "outdated"] as const;
export const sourceContentTypeValues = [
  "concept",
  "example",
  "question",
  "reference",
  "mixed",
] as const;
export const duplicateKindValues = ["exact", "semantic"] as const;
export const duplicateReviewStatusValues = ["pending", "confirmed", "dismissed"] as const;

export const questionTypeEnum = pgEnum("question_type", questionTypeValues);
export const questionLevelEnum = pgEnum("question_level", questionLevelValues);
export const questionStatusEnum = pgEnum("question_status", questionStatusValues);
export const sessionModeEnum = pgEnum("session_mode", sessionModeValues);
export const sessionStateEnum = pgEnum("session_state", sessionStateValues);
export const sourceTypeEnum = pgEnum("source_type", sourceTypeValues);
export const sourceStatusEnum = pgEnum("source_status", sourceStatusValues);
export const sourceContentTypeEnum = pgEnum("source_content_type", sourceContentTypeValues);
export const duplicateKindEnum = pgEnum("duplicate_kind", duplicateKindValues);
export const duplicateReviewStatusEnum = pgEnum(
  "duplicate_review_status",
  duplicateReviewStatusValues,
);
