ALTER TABLE "evaluations" ADD COLUMN "dimension_feedback" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "uncertainty" text;