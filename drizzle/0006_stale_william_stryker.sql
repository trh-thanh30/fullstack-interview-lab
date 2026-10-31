CREATE TABLE "ai_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correlation_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"status" text NOT NULL,
	"error_code" text,
	"latency_ms" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"estimated_cost_usd" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_question_id" uuid NOT NULL,
	"answer_text" text DEFAULT '' NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "correlation_id" uuid;--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "provider_response_id" text;--> statement-breakpoint
ALTER TABLE "answer_drafts" ADD CONSTRAINT "answer_drafts_session_question_id_session_questions_id_fk" FOREIGN KEY ("session_question_id") REFERENCES "public"."session_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_calls_correlation_id_unique" ON "ai_calls" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "ai_calls_feature_created_at_idx" ON "ai_calls" USING btree ("feature","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "answer_drafts_session_question_unique" ON "answer_drafts" USING btree ("session_question_id");