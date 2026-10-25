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

export const questionTypeEnum = pgEnum("question_type", questionTypeValues);
export const questionLevelEnum = pgEnum("question_level", questionLevelValues);
export const questionStatusEnum = pgEnum("question_status", questionStatusValues);
export const sessionModeEnum = pgEnum("session_mode", sessionModeValues);
export const sessionStateEnum = pgEnum("session_state", sessionStateValues);
export const sourceTypeEnum = pgEnum("source_type", sourceTypeValues);
export const sourceStatusEnum = pgEnum("source_status", sourceStatusValues);
