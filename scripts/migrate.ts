import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

import { getRequiredEnv } from "../src/lib/env";

loadEnvConfig(process.cwd());

const client = neon(getRequiredEnv("DATABASE_URL"));
const database = drizzle({ client });

await migrate(database, { migrationsFolder: "./drizzle" });

console.info("Database migrations applied successfully.");
