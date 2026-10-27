CREATE TABLE "question_generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"provider_response_id" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_generation_runs" ADD CONSTRAINT "question_generation_runs_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_generation_runs_question_id_unique" ON "question_generation_runs" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "question_generation_runs_model_created_at_idx" ON "question_generation_runs" USING btree ("model","created_at");