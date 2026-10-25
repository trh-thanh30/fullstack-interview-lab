import { loadEnvConfig } from "@next/env";

import { seedTaxonomy } from "../src/db/seed";

loadEnvConfig(process.cwd());

const { getDatabase } = await import("../src/db/client");

await seedTaxonomy(getDatabase());

console.info("Taxonomy seed completed successfully.");
