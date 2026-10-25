import { loadEnvConfig } from "@next/env";

import { DrizzleSourceRegistryStore } from "../src/content/drizzle-source-registry-store";
import { createFileSourceInput, discoverSourceFiles } from "../src/content/file-sources";
import { parseSourceStatus, registerSource } from "../src/content/source-registry";

loadEnvConfig(process.cwd());

const [command, ...args] = process.argv.slice(2);

if (!command || command === "help" || command === "--help") {
  printUsage();
  process.exit(0);
}

const { getDatabase } = await import("../src/db/client");
const store = new DrizzleSourceRegistryStore(getDatabase());

if (command === "list") {
  const status = parseSourceStatus(readOption(args, "--status"));
  const registeredSources = await store.list(status);

  console.table(
    registeredSources.map((source) => ({
      status: source.status,
      type: source.type,
      title: source.title,
      uri: source.uri,
      checksum: source.checksum.slice(0, 12),
      importedAt: source.importedAt?.toISOString() ?? "—",
      lastReviewedAt: source.lastReviewedAt?.toISOString() ?? "—",
    })),
  );
  console.info(`${registeredSources.length} source(s).`);
} else if (command === "register") {
  const file = requireOption(args, "--file");
  const licenseNote = readOption(args, "--license-note");
  const result = await registerSource(
    store,
    await createFileSourceInput(file, licenseNote),
  );

  console.info(`${result.action}: ${result.source.title} (${result.source.status})`);
} else if (command === "scan") {
  const licenseNote = readOption(args, "--license-note");
  const paths = positionalArguments(args);

  if (paths.length === 0) {
    throw new Error("The scan command requires at least one file or directory path.");
  }

  const files = await discoverSourceFiles(paths);
  const counts = { created: 0, duplicate: 0, outdated: 0, unchanged: 0 };

  for (const file of files) {
    const result = await registerSource(
      store,
      await createFileSourceInput(file, licenseNote),
    );

    counts[result.action] += 1;
    console.info(`${result.action.padEnd(9)} ${file}`);
  }

  console.info(`Scanned ${files.length} file(s).`, counts);
} else {
  throw new Error(`Unknown source command: ${command}`);
}

function readOption(args: string[], option: string) {
  const index = args.indexOf(option);

  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${option}.`);
  }

  return value;
}

function requireOption(args: string[], option: string) {
  const value = readOption(args, option);

  if (!value) {
    throw new Error(`Missing required option: ${option}.`);
  }

  return value;
}

function positionalArguments(args: string[]) {
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    if (args[index]?.startsWith("--")) {
      index += 1;
    } else if (args[index]) {
      positional.push(args[index]);
    }
  }

  return positional;
}

function printUsage() {
  console.info(`Source registry CLI

Usage:
  pnpm source:list -- --status new
  pnpm source:register -- --file <path> [--license-note <note>]
  pnpm source:scan -- <path...> [--license-note <note>]

Supported scan file types: .md, .markdown, .pdf`);
}
