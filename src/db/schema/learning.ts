import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { questions } from "./questions";
import { users } from "./identity";

export const reviewSchedules = pgTable(
  "review_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    ease: numeric("ease", { mode: "number", precision: 4, scale: 2 })
      .default(2.5)
      .notNull(),
    intervalDays: integer("interval_days").default(0).notNull(),
    repetitions: integer("repetitions").default(0).notNull(),
    dueAt: timestamp("due_at", { mode: "date", withTimezone: true }).notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { mode: "date", withTimezone: true }),
    lastResult: text("last_result").notNull(),
    lastConfidence: integer("last_confidence").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("review_schedules_user_question_unique").on(table.userId, table.questionId),
    index("review_schedules_user_due_at_idx").on(table.userId, table.dueAt),
  ],
);
