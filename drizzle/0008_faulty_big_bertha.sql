ALTER TABLE "interview_sessions" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "deadline_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session_questions" ADD COLUMN "parent_session_question_id" uuid;--> statement-breakpoint
ALTER TABLE "session_questions" ADD COLUMN "follow_up_number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_questions" ADD CONSTRAINT "session_questions_parent_session_question_id_session_questions_id_fk" FOREIGN KEY ("parent_session_question_id") REFERENCES "public"."session_questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_questions_parent_id_idx" ON "session_questions" USING btree ("parent_session_question_id");