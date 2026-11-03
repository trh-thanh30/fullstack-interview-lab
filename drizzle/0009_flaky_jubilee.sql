CREATE TABLE "coding_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid,
	"language" text DEFAULT 'typescript' NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coding_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"language" text NOT NULL,
	"code_snapshot" text NOT NULL,
	"explanation_snapshot" text NOT NULL,
	"execution_status" text DEFAULT 'not_run' NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"complexity" text NOT NULL,
	"correctness_assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edge_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"provider_response_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"filename" text,
	"mime_type" text,
	"size_bytes" integer,
	"blob_url" text,
	"blob_pathname" text,
	"mermaid_text" text,
	"alt_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_design_checkpoint_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"checkpoint" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "system_design_problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"level" "question_level" NOT NULL,
	"context" text NOT NULL,
	"functional_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"non_functional_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rubric" jsonb NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_design_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"dimension_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gaps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tradeoffs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"provider_response_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coding_drafts" ADD CONSTRAINT "coding_drafts_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_drafts" ADD CONSTRAINT "coding_drafts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_reviews" ADD CONSTRAINT "coding_reviews_draft_id_coding_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."coding_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_attachments" ADD CONSTRAINT "design_attachments_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_design_checkpoint_responses" ADD CONSTRAINT "system_design_checkpoint_responses_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_design_reviews" ADD CONSTRAINT "system_design_reviews_response_id_system_design_checkpoint_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."system_design_checkpoint_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coding_drafts_session_unique" ON "coding_drafts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "coding_reviews_draft_created_idx" ON "coding_reviews" USING btree ("draft_id","created_at");--> statement-breakpoint
CREATE INDEX "design_attachments_session_created_idx" ON "design_attachments" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "system_design_responses_session_checkpoint_unique" ON "system_design_checkpoint_responses" USING btree ("session_id","checkpoint");--> statement-breakpoint
CREATE INDEX "system_design_responses_session_idx" ON "system_design_checkpoint_responses" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "system_design_problems_slug_unique" ON "system_design_problems" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "system_design_reviews_response_created_idx" ON "system_design_reviews" USING btree ("response_id","created_at");