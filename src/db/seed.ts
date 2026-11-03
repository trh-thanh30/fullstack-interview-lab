import { sql, type SQL } from "drizzle-orm";

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

export async function seedAll(database: SeedExecutor) {
  await seedTaxonomy(database);
  await seedSystemDesignProblems(database);
}
