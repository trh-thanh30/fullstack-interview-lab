// @vitest-environment node

import { readdir } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const testFilePattern = /\.(?:integration\.)?(?:test|spec)\.[cm]?[jt]sx?$/;
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".mts"]);

describe("repository test layout", () => {
  it("keeps source test files inside a tests directory", async () => {
    const sourceRoot = join(process.cwd(), "src");
    const files = await collectFiles(sourceRoot);
    const misplacedTests = files
      .filter((path) => sourceExtensions.has(extname(path)) && testFilePattern.test(path))
      .filter((path) => !relative(sourceRoot, path).split(sep).includes("tests"))
      .map((path) => relative(process.cwd(), path));

    expect(misplacedTests, "Move these test files into the nearest tests/ directory").toEqual([]);
  });
});

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}
