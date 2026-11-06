import { createHash } from "node:crypto";

import { sql, type SQL } from "drizzle-orm";

import { fullstackQuestionSeed } from "./question-seed-catalog";
import { systemDesignProblemSeed, technologySeed, topicSeed } from "./seed-data";

export type SeedExecutor = {
  execute(query: SQL): Promise<unknown>;
};

export async function seedTaxonomy(database: SeedExecutor) {
  for (const topic of topicSeed) {
    await database.execute(sql`
      INSERT INTO topics (slug, name, description, position)
      VALUES (${topic.slug}, ${topic.name}, ${topic.description}, ${topic.position})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        position = EXCLUDED.position,
        updated_at = now()
    `);
  }

  for (const technology of technologySeed) {
    await database.execute(sql`
      INSERT INTO technologies (slug, name, primary_topic_id)
      SELECT ${technology.slug}, ${technology.name}, topics.id
      FROM topics
      WHERE topics.slug = ${technology.topicSlug}
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        primary_topic_id = EXCLUDED.primary_topic_id,
        updated_at = now()
    `);
  }
}

const systemDesignRubric = [
  { key: "requirements", label: "Requirements", description: "Làm rõ scope, actor, use case và out-of-scope.", weight: 15 },
  { key: "estimation", label: "Estimation", description: "Ước lượng traffic, storage, bandwidth và nêu assumption.", weight: 10 },
  { key: "architecture", label: "Architecture", description: "Ranh giới component, data flow và API hợp lý.", weight: 20 },
  { key: "data", label: "Data", description: "Data model, access pattern, consistency và lifecycle.", weight: 15 },
  { key: "scaling", label: "Scaling", description: "Bottleneck, partitioning, cache và capacity growth.", weight: 15 },
  { key: "reliability", label: "Reliability", description: "Failure mode, retry, idempotency, recovery và observability.", weight: 15 },
  { key: "security", label: "Security", description: "Auth, authorization, abuse, privacy và secret handling.", weight: 10 },
] as const;

export async function seedSystemDesignProblems(database: SeedExecutor) {
  for (const problem of systemDesignProblemSeed) {
    await database.execute(sql`
      INSERT INTO system_design_problems (
        slug, title, level, context, functional_requirements,
        non_functional_requirements, constraints, rubric, reviewed_at
      ) VALUES (
        ${problem.slug}, ${problem.title}, ${problem.level}, ${problem.context},
        ${JSON.stringify(problem.functionalRequirements)}::jsonb,
        ${JSON.stringify(problem.nonFunctionalRequirements)}::jsonb,
        ${JSON.stringify(problem.constraints)}::jsonb,
        ${JSON.stringify(systemDesignRubric)}::jsonb,
        now()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        level = EXCLUDED.level,
        context = EXCLUDED.context,
        functional_requirements = EXCLUDED.functional_requirements,
        non_functional_requirements = EXCLUDED.non_functional_requirements,
        constraints = EXCLUDED.constraints,
        rubric = EXCLUDED.rubric,
        reviewed_at = now(),
        updated_at = now()
    `);
  }
}

export function starterQuestionId(key: string) {
  const hash = createHash("sha256").update(`interview-lab:starter-question:${key}`).digest("hex");
  const variant = ((Number.parseInt(hash[16]!, 16) & 0x3) | 0x8).toString(16);

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function seedStarterQuestions(database: SeedExecutor) {
  const questionRows = fullstackQuestionSeed.map((question) => sql`(
    ${starterQuestionId(question.key)}::uuid,
    ${question.topicSlug},
    ${question.type}::question_type,
    ${question.level}::question_level,
    ${question.prompt},
    ${question.explanation}
  )`);

  await database.execute(sql`
    INSERT INTO questions (
      id, topic_id, type, level, status, prompt, explanation,
      is_manual, version, last_reviewed_at, created_at, updated_at
    )
    SELECT
      seed.id, topics.id, seed.type, seed.level, 'published', seed.prompt,
      seed.explanation, true, 1, now(), now(), now()
    FROM (VALUES ${sql.join(questionRows, sql`, `)})
      AS seed(id, topic_slug, type, level, prompt, explanation)
    INNER JOIN topics ON topics.slug = seed.topic_slug
    ON CONFLICT (id) DO UPDATE SET
      topic_id = EXCLUDED.topic_id,
      type = EXCLUDED.type,
      level = EXCLUDED.level,
      status = 'published',
      prompt = EXCLUDED.prompt,
      explanation = EXCLUDED.explanation,
      is_manual = true,
      last_reviewed_at = now(),
      updated_at = now()
  `);

  const choiceRows = fullstackQuestionSeed.flatMap((question) =>
    question.choices.map((choice) => sql`(
      ${starterQuestionId(question.key)}::uuid,
      ${choice.content},
      ${choice.isCorrect},
      ${choice.position}
    )`),
  );

  if (choiceRows.length) {
    await database.execute(sql`
      INSERT INTO question_choices (question_id, content, is_correct, position)
      VALUES ${sql.join(choiceRows, sql`, `)}
      ON CONFLICT (question_id, position) DO UPDATE SET
        content = EXCLUDED.content,
        is_correct = EXCLUDED.is_correct
    `);
  }

  const technologyRows = fullstackQuestionSeed.flatMap((question) =>
    question.technologySlugs.map((technologySlug) => sql`(
      ${starterQuestionId(question.key)}::uuid,
      ${technologySlug}
    )`),
  );

  await database.execute(sql`
    INSERT INTO question_technologies (question_id, technology_id)
    SELECT seed.question_id, technologies.id
    FROM (VALUES ${sql.join(technologyRows, sql`, `)})
      AS seed(question_id, technology_slug)
    INNER JOIN technologies ON technologies.slug = seed.technology_slug
    ON CONFLICT (question_id, technology_id) DO NOTHING
  `);

  const rubricRows = fullstackQuestionSeed.flatMap((question) =>
    question.rubric
      ? [sql`(
          ${starterQuestionId(question.key)}::uuid,
          1,
          ${JSON.stringify(question.rubric.dimensions)}::jsonb,
          ${question.rubric.referenceAnswer}
        )`]
      : [],
  );

  if (rubricRows.length) {
    await database.execute(sql`
      INSERT INTO rubrics (question_id, version, dimensions, reference_answer)
      VALUES ${sql.join(rubricRows, sql`, `)}
      ON CONFLICT (question_id, version) DO UPDATE SET
        dimensions = EXCLUDED.dimensions,
        reference_answer = EXCLUDED.reference_answer
    `);
  }
}

export async function seedAll(database: SeedExecutor) {
  await seedTaxonomy(database);
  await seedStarterQuestions(database);
  await seedSystemDesignProblems(database);
}
