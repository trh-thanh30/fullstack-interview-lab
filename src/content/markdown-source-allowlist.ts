import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { discoverSourceFiles } from "./file-sources";

export const markdownSourceDirectoryAllowlist = [
  "frontend/javascript",
  "frontend/react",
  "backend/nodejs",
  "backend/nestjs",
  "devops/docker",
] as const;

export async function discoverAllowlistedMarkdownFiles(
  rootDirectory: string,
  allowedDirectories: readonly string[] = markdownSourceDirectoryAllowlist,
) {
  const canonicalRoot = await realpath(rootDirectory);
  const rootStat = await stat(canonicalRoot);

  if (!rootStat.isDirectory()) {
    throw new Error(`Markdown source root is not a directory: ${rootDirectory}`);
  }

  const directories: string[] = [];

  for (const allowedDirectory of allowedDirectories) {
    if (isAbsolute(allowedDirectory)) {
      throw new Error(`Allowlist entry must be relative: ${allowedDirectory}`);
    }

    const candidate = await realpath(resolve(canonicalRoot, allowedDirectory));
    const relativePath = relative(canonicalRoot, candidate);

    if (relativePath.startsWith(`..${sep}`) || relativePath === ".." || isAbsolute(relativePath)) {
      throw new Error(`Allowlist entry escapes source root: ${allowedDirectory}`);
    }

    if (!(await stat(candidate)).isDirectory()) {
      throw new Error(`Allowlist entry is not a directory: ${allowedDirectory}`);
    }

    directories.push(candidate);
  }

  const files = await discoverSourceFiles(directories);
  return files.filter((path) => /\.md$/i.test(path));
}
