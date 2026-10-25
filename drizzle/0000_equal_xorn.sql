CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."question_level" AS ENUM('junior', 'middle', 'senior');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('draft', 'reviewed', 'published', 'outdated', 'archived');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('mcq', 'short_answer', 'deep_dive', 'system_design', 'coding');--> statement-breakpoint
CREATE TYPE "public"."session_mode" AS ENUM('mcq', 'short_answer', 'mock_interview', 'system_design', 'coding');--> statement-breakpoint
CREATE TYPE "public"."session_state" AS ENUM('setup', 'asking', 'answering', 'follow_up', 'evaluating', 'summary', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('new', 'processed', 'failed', 'outdated');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('markdown', 'pdf', 'url', 'manual');--> statement-breakpoint
CREATE TABLE "source_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"page_number" integer,
	"heading" text,
	"content" text NOT NULL,
	"checksum" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "source_type" NOT NULL,
	"status" "source_status" DEFAULT 'new' NOT NULL,
	"title" text NOT NULL,
	"uri" text NOT NULL,
	"checksum" text NOT NULL,
	"license_note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"imported_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technologies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"primary_topic_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image_url" text,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"content" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_sources" (
	"question_id" uuid NOT NULL,
	"source_chunk_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "question_sources_pk" PRIMARY KEY("question_id","source_chunk_id")
);
--> statement-breakpoint
CREATE TABLE "question_technologies" (
	"question_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	CONSTRAINT "question_technologies_pk" PRIMARY KEY("question_id","technology_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"type" "question_type" NOT NULL,
	"level" "question_level" NOT NULL,
	"status" "question_status" DEFAULT 'draft' NOT NULL,
	"prompt" text NOT NULL,
	"explanation" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"dimensions" jsonb NOT NULL,
	"reference_answer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_question_id" uuid NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"answer_text" text,
	"selected_choice_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"answer_id" uuid NOT NULL,
	"rubric_id" uuid,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missing_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"incorrect_claims" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_answer" text,
	"follow_up_question" text,
	"source_chunk_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"latency_ms" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" "session_mode" NOT NULL,
	"state" "session_state" DEFAULT 'setup' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_position" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid,
	"position" integer NOT NULL,
	"question_type" "question_type" NOT NULL,
	"prompt_snapshot" text NOT NULL,
	"choices_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rubric_snapshot" jsonb,
	"asked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technologies" ADD CONSTRAINT "technologies_primary_topic_id_topics_id_fk" FOREIGN KEY ("primary_topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_parent_id_topics_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_choices" ADD CONSTRAINT "question_choices_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_sources" ADD CONSTRAINT "question_sources_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_sources" ADD CONSTRAINT "question_sources_source_chunk_id_source_chunks_id_fk" FOREIGN KEY ("source_chunk_id") REFERENCES "public"."source_chunks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_technologies" ADD CONSTRAINT "question_technologies_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_technologies" ADD CONSTRAINT "question_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubrics" ADD CONSTRAINT "rubrics_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_session_question_id_session_questions_id_fk" FOREIGN KEY ("session_question_id") REFERENCES "public"."session_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_rubric_id_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_questions" ADD CONSTRAINT "session_questions_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_questions" ADD CONSTRAINT "session_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "source_chunks_source_position_unique" ON "source_chunks" USING btree ("source_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "source_chunks_source_checksum_unique" ON "source_chunks" USING btree ("source_id","checksum");--> statement-breakpoint
CREATE INDEX "source_chunks_source_id_idx" ON "source_chunks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "source_chunks_embedding_hnsw_idx" ON "source_chunks" USING hnsw ("embedding" vector_cosine_ops) WHERE "source_chunks"."embedding" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sources_uri_unique" ON "sources" USING btree ("uri");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_checksum_unique" ON "sources" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "sources_status_idx" ON "sources" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "technologies_slug_unique" ON "technologies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "technologies_primary_topic_id_idx" ON "technologies" USING btree ("primary_topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_slug_unique" ON "topics" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "topics_parent_id_idx" ON "topics" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "question_choices_question_position_unique" ON "question_choices" USING btree ("question_id","position");--> statement-breakpoint
CREATE INDEX "question_choices_question_id_idx" ON "question_choices" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "question_sources_source_chunk_id_idx" ON "question_sources" USING btree ("source_chunk_id");--> statement-breakpoint
CREATE INDEX "question_technologies_technology_id_idx" ON "question_technologies" USING btree ("technology_id");--> statement-breakpoint
CREATE INDEX "questions_topic_status_idx" ON "questions" USING btree ("topic_id","status");--> statement-breakpoint
CREATE INDEX "questions_type_level_idx" ON "questions" USING btree ("type","level");--> statement-breakpoint
CREATE UNIQUE INDEX "rubrics_question_version_unique" ON "rubrics" USING btree ("question_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "answers_session_question_attempt_unique" ON "answers" USING btree ("session_question_id","attempt_number");--> statement-breakpoint
CREATE INDEX "evaluations_answer_created_at_idx" ON "evaluations" USING btree ("answer_id","created_at");--> statement-breakpoint
CREATE INDEX "interview_sessions_user_created_at_idx" ON "interview_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "interview_sessions_user_state_idx" ON "interview_sessions" USING btree ("user_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "session_questions_session_position_unique" ON "session_questions" USING btree ("session_id","position");--> statement-breakpoint
CREATE INDEX "session_questions_question_id_idx" ON "session_questions" USING btree ("question_id");
