import { sql, type SQL } from "drizzle-orm";

import { technologySeed, topicSeed } from "./seed-data";

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
