import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getRequiredEnv } from "@/lib/env";

import * as schema from "./schema";

function createDatabase() {
  const client = neon(getRequiredEnv("DATABASE_URL"));
  return drizzle({ client, schema });
}

export type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

export function getDatabase() {
  database ??= createDatabase();
  return database;
}
