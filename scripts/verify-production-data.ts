import { loadEnvConfig } from "@next/env";
import { and, count, eq } from "drizzle-orm";

import { questions, sources, systemDesignProblems } from "../src/db/schema";

loadEnvConfig(process.cwd());
const { getDatabase } = await import("../src/db/client");
const database = getDatabase();
const requirements = [
  { label: "processed sources", minimum: readMinimum("RELEASE_MIN_PROCESSED_SOURCES", 1), query: database.select({ value: count() }).from(sources).where(eq(sources.status, "processed")) },
  { label: "published MCQ", minimum: readMinimum("RELEASE_MIN_PUBLISHED_MCQ", 20), query: database.select({ value: count() }).from(questions).where(and(eq(questions.status, "published"), eq(questions.type, "mcq"))) },
  { label: "published essay questions", minimum: readMinimum("RELEASE_MIN_PUBLISHED_ESSAY", 4), query: database.select({ value: count() }).from(questions).where(and(eq(questions.status, "published"), eq(questions.type, "short_answer"))) },
  { label: "published coding questions", minimum: readMinimum("RELEASE_MIN_PUBLISHED_CODING", 1), query: database.select({ value: count() }).from(questions).where(and(eq(questions.status, "published"), eq(questions.type, "coding"))) },
  { label: "reviewed system-design templates", minimum: 3, query: database.select({ value: count() }).from(systemDesignProblems) },
];
let failed = false;
for (const requirement of requirements) {
  const [row] = await requirement.query;
  const actual = row?.value ?? 0;
  const passed = actual >= requirement.minimum;
  console.info(`${passed ? "PASS" : "FAIL"} ${requirement.label}: ${actual}/${requirement.minimum}`);
  if (!passed) failed = true;
}
if (failed) {
  console.error("Production dataset chưa đạt release minimum.");
  process.exitCode = 1;
}

function readMinimum(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}
