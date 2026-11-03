import { loadEnvConfig } from "@next/env";

import { seedAll } from "../src/db/seed";

loadEnvConfig(process.cwd());

const { getDatabase } = await import("../src/db/client");

await seedAll(getDatabase());

console.info("Taxonomy and reviewed system-design templates seeded successfully.");
