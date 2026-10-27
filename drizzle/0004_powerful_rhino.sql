CREATE TYPE "public"."question_review_action" AS ENUM('approve', 'reject', 'merge', 'mark_outdated');--> statement-breakpoint
CREATE TABLE "question_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"action" "question_review_action" NOT NULL,
	"previous_status" "question_status" NOT NULL,
	"new_status" "question_status" NOT NULL,
	"reason" text,
	"merged_into_question_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_review_events" ADD CONSTRAINT "question_review_events_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_review_events" ADD CONSTRAINT "question_review_events_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_review_events" ADD CONSTRAINT "question_review_events_merged_into_question_id_questions_id_fk" FOREIGN KEY ("merged_into_question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_review_events_question_created_at_idx" ON "question_review_events" USING btree ("question_id","created_at");--> statement-breakpoint
CREATE INDEX "question_review_events_reviewer_created_at_idx" ON "question_review_events" USING btree ("reviewer_user_id","created_at");--> statement-breakpoint
CREATE INDEX "question_review_events_merged_into_idx" ON "question_review_events" USING btree ("merged_into_question_id");