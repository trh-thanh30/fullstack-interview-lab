import { loadEnvConfig } from "@next/env";

import { DrizzleSourceChunkStore } from "../src/content/drizzle-source-chunk-store";
import { DrizzleSourceRegistryStore } from "../src/content/drizzle-source-registry-store";
import { importPdfBatch } from "../src/content/pdf-importer";
import { discoverAllowlistedPdfFiles } from "../src/content/pdf-source-allowlist";

loadEnvConfig(process.cwd());

const args = process.argv.slice(2);
const rootDirectory = readRequiredOption(args, "--root");
const licenseNote = readOption(args, "--license-note");
const files = await discoverAllowlistedPdfFiles(rootDirectory);
const { getDatabase } = await import("../src/db/client");
const database = getDatabase();
const result = await importPdfBatch({
  paths: files,
  registry: new DrizzleSourceRegistryStore(database),
  chunks: new DrizzleSourceChunkStore(database),
  licenseNote,
});

for (const imported of result.imported) {
  console.info(
    `${imported.action.padEnd(8)} ${String(imported.chunkCount).padStart(4)} chunks  ${String(imported.reviewCount).padStart(3)} review  ${imported.path}`,
  );
}

for (const failure of result.failed) {
  console.error(`failed                         ${failure.path}: ${failure.error}`);
}

console.info(`PDF import finished: ${result.imported.length} succeeded, ${result.failed.length} failed.`);

if (result.failed.length > 0) process.exitCode = 1;

function readOption(values: string[], option: string) {
  const index = values.indexOf(option);
  const value = index === -1 ? undefined : values[index + 1];
  if (index !== -1 && (!value || value.startsWith("--"))) {
    throw new Error(`Missing value for ${option}.`);
  }
  return value;
}

function readRequiredOption(values: string[], option: string) {
  const value = readOption(values, option);
  if (!value) throw new Error(`Missing required option: ${option}.`);
  return value;
}
