import { loadEnvConfig } from "@next/env";

import { DrizzleSourceNormalizationStore } from "../src/content/drizzle-source-normalization-store";
import { OpenAIEmbeddingProvider } from "../src/content/embedding-provider";
import { normalizeSourceContent } from "../src/content/source-normalization";
import { seedTaxonomy } from "../src/db/seed";
import { getRequiredEnv } from "../src/lib/env";

loadEnvConfig(process.cwd());

const args = process.argv.slice(2);
const semanticThreshold = readNumberOption(args, "--semantic-threshold", 0.92);
const embeddingModel = readOption(args, "--embedding-model") ?? "text-embedding-3-small";
const { getDatabase } = await import("../src/db/client");
const database = getDatabase();

await seedTaxonomy(database);

const result = await normalizeSourceContent({
  store: new DrizzleSourceNormalizationStore(database),
  embedder: new OpenAIEmbeddingProvider(getRequiredEnv("OPENAI_API_KEY"), embeddingModel),
  semanticThreshold,
});

console.info(`Normalized ${result.chunkCount} chunks; generated ${result.embeddedCount} embeddings.`);
printCounts("Category", result.report.topics);
printCounts("Technology", result.report.technologies);
printCounts("Level", result.report.levels);
printCounts("Content type", result.report.contentTypes);
console.info(
  `Duplicate review queue: ${result.exactDuplicateCount} exact, ${result.semanticDuplicateCount} semantic candidates.`,
);

const previewLimit = 20;
for (const candidate of result.duplicateCandidates.slice(0, previewLimit)) {
  console.info(
    `${candidate.kind.padEnd(8)} ${candidate.similarity.toFixed(4)}  ${candidate.first.sourceTitle} :: ${candidate.first.heading ?? "(no heading)"}`,
  );
  console.info(
    `${"".padEnd(15)}${candidate.second.sourceTitle} :: ${candidate.second.heading ?? "(no heading)"}`,
  );
  console.info(`${"".padEnd(15)}${candidate.first.sourceUri} <> ${candidate.second.sourceUri}`);
}

if (result.duplicateCandidates.length > previewLimit) {
  console.info(`${result.duplicateCandidates.length - previewLimit} more candidates are stored in the review queue.`);
}

function printCounts(label: string, counts: Record<string, number>) {
  console.info(`\n${label}`);
  for (const [name, count] of Object.entries(counts).sort(([left], [right]) => left.localeCompare(right))) {
    console.info(`  ${name.padEnd(24)} ${String(count).padStart(5)}`);
  }
}

function readOption(values: string[], option: string) {
  const index = values.indexOf(option);
  const value = index === -1 ? undefined : values[index + 1];

  if (index !== -1 && (!value || value.startsWith("--"))) {
    throw new Error(`Missing value for ${option}.`);
  }

  return value;
}

function readNumberOption(values: string[], option: string, fallback: number) {
  const rawValue = readOption(values, option);
  if (!rawValue) return fallback;

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${option} must be a number between 0 and 1.`);
  }
  return value;
}
