CREATE TYPE "public"."duplicate_kind" AS ENUM('exact', 'semantic');--> statement-breakpoint
CREATE TYPE "public"."duplicate_review_status" AS ENUM('pending', 'confirmed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."source_content_type" AS ENUM('concept', 'example', 'question', 'reference', 'mixed');--> statement-breakpoint
CREATE TABLE "source_chunk_technologies" (
	"source_chunk_id" uuid NOT NULL,
	"technology_id" uuid NOT NULL,
	CONSTRAINT "source_chunk_technologies_pk" PRIMARY KEY("source_chunk_id","technology_id")
);
--> statement-breakpoint
CREATE TABLE "source_duplicate_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_chunk_id" uuid NOT NULL,
	"second_chunk_id" uuid NOT NULL,
	"kind" "duplicate_kind" NOT NULL,
	"similarity" double precision NOT NULL,
	"status" "duplicate_review_status" DEFAULT 'pending' NOT NULL,
	"first_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "source_chunks" ADD COLUMN "topic_id" uuid;--> statement-breakpoint
ALTER TABLE "source_chunks" ADD COLUMN "level" "question_level";--> statement-breakpoint
ALTER TABLE "source_chunks" ADD COLUMN "content_type" "source_content_type";--> statement-breakpoint
ALTER TABLE "source_chunks" ADD COLUMN "embedding_model" text;--> statement-breakpoint
ALTER TABLE "source_chunks" ADD COLUMN "embedded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "source_chunks" ADD COLUMN "classified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "source_chunk_technologies" ADD CONSTRAINT "source_chunk_technologies_source_chunk_id_source_chunks_id_fk" FOREIGN KEY ("source_chunk_id") REFERENCES "public"."source_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_chunk_technologies" ADD CONSTRAINT "source_chunk_technologies_technology_id_technologies_id_fk" FOREIGN KEY ("technology_id") REFERENCES "public"."technologies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_duplicate_candidates" ADD CONSTRAINT "source_duplicate_candidates_first_chunk_id_source_chunks_id_fk" FOREIGN KEY ("first_chunk_id") REFERENCES "public"."source_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_duplicate_candidates" ADD CONSTRAINT "source_duplicate_candidates_second_chunk_id_source_chunks_id_fk" FOREIGN KEY ("second_chunk_id") REFERENCES "public"."source_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_chunk_technologies_technology_id_idx" ON "source_chunk_technologies" USING btree ("technology_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_duplicate_candidates_pair_kind_unique" ON "source_duplicate_candidates" USING btree ("first_chunk_id","second_chunk_id","kind");--> statement-breakpoint
CREATE INDEX "source_duplicate_candidates_status_idx" ON "source_duplicate_candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "source_duplicate_candidates_second_chunk_id_idx" ON "source_duplicate_candidates" USING btree ("second_chunk_id");--> statement-breakpoint
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_chunks_topic_id_idx" ON "source_chunks" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "source_chunks_level_content_type_idx" ON "source_chunks" USING btree ("level","content_type");