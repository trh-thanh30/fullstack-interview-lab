ALTER TABLE "answers" ADD COLUMN "is_correct" boolean;--> statement-breakpoint
ALTER TABLE "session_questions" ADD COLUMN "explanation_snapshot" text;--> statement-breakpoint
ALTER TABLE "session_questions" ADD COLUMN "topic_id_snapshot" uuid;--> statement-breakpoint
ALTER TABLE "session_questions" ADD COLUMN "topic_name_snapshot" text;--> statement-breakpoint
ALTER TABLE "session_questions" ADD COLUMN "answer_key_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "session_questions" ADD COLUMN "source_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "session_questions" AS sq
SET
	"explanation_snapshot" = q."explanation",
	"topic_id_snapshot" = q."topic_id",
	"topic_name_snapshot" = t."name"
FROM "questions" AS q
INNER JOIN "topics" AS t ON t."id" = q."topic_id"
WHERE sq."question_id" = q."id";--> statement-breakpoint
UPDATE "session_questions"
SET
	"topic_id_snapshot" = '00000000-0000-0000-0000-000000000000',
	"topic_name_snapshot" = 'Unknown'
WHERE "topic_id_snapshot" IS NULL;--> statement-breakpoint
UPDATE "session_questions" AS sq
SET "answer_key_snapshot" = answer_keys."choice_ids"
FROM (
	SELECT "question_id", jsonb_agg("id" ORDER BY "position") AS "choice_ids"
	FROM "question_choices"
	WHERE "is_correct" = true
	GROUP BY "question_id"
) AS answer_keys
WHERE sq."question_id" = answer_keys."question_id";--> statement-breakpoint
UPDATE "answers" AS a
SET "is_correct" = (a."selected_choice_ids" = sq."answer_key_snapshot")
FROM "session_questions" AS sq
WHERE a."session_question_id" = sq."id";--> statement-breakpoint
ALTER TABLE "session_questions" ALTER COLUMN "topic_id_snapshot" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "session_questions" ALTER COLUMN "topic_name_snapshot" SET NOT NULL;
