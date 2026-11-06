import nextEnv from "@next/env";

import { fullstackQuestionSeed } from "../src/db/question-seed-catalog";
import { seedAll } from "../src/db/seed";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const { getDatabase } = await import("../src/db/client");

await seedAll(getDatabase());

console.info(
  `Taxonomy, ${fullstackQuestionSeed.length} published practice questions and reviewed system-design templates seeded successfully.`,
);
