import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, realpath, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";

import type { RegisterSourceInput, SourceType } from "./source-registry";

const ignoredDirectories = new Set([".git", ".next", "node_modules"]);
const fileTypes: Record<string, SourceType | undefined> = {
  ".md": "markdown",
  ".markdown": "markdown",
  ".pdf": "pdf",
};

export async function checksumFile(path: string) {
  const hash = createHash("sha256");

  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

export async function discoverSourceFiles(paths: string[]) {
  const discoveredFiles = new Set<string>();

  for (const path of paths) {
    await discoverPath(path, discoveredFiles);
  }

  return [...discoveredFiles].sort((left, right) => left.localeCompare(right));
}

export async function createFileSourceInput(
  path: string,
  licenseNote?: string,
): Promise<RegisterSourceInput> {
  const canonicalPath = await realpath(path);
  const extension = extname(canonicalPath).toLowerCase();
  const type = fileTypes[extension];

  if (!type) {
    throw new Error(`Unsupported source file: ${path}. Expected Markdown or PDF.`);
  }

  const fileStat = await stat(canonicalPath);

  if (!fileStat.isFile()) {
    throw new Error(`Source path is not a file: ${path}`);
  }

  return {
    type,
    title: basename(canonicalPath, extension),
    uri: pathToFileURL(canonicalPath).href,
    checksum: await checksumFile(canonicalPath),
    licenseNote: licenseNote?.trim() || null,
    metadata: {
      extension,
      modifiedAt: fileStat.mtime.toISOString(),
      path: canonicalPath,
      sizeBytes: fileStat.size,
    },
  };
}

async function discoverPath(path: string, discoveredFiles: Set<string>): Promise<void> {
  const pathStat = await stat(path);

  if (pathStat.isFile()) {
    if (fileTypes[extname(path).toLowerCase()]) {
      discoveredFiles.add(await realpath(path));
    }

    return;
  }

  if (!pathStat.isDirectory()) {
    return;
  }

  const entries = await readdir(path, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") || (entry.isDirectory() && ignoredDirectories.has(entry.name))) {
      continue;
    }

    const entryPath = join(path, entry.name);

    if (entry.isDirectory()) {
      await discoverPath(entryPath, discoveredFiles);
    } else if (entry.isFile() && fileTypes[extname(entry.name).toLowerCase()]) {
      discoveredFiles.add(await realpath(entryPath));
    }
  }
}
