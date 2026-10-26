// @vitest-environment node

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverAllowlistedMarkdownFiles } from "../markdown-source-allowlist";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("Markdown directory allowlist", () => {
  it("discovers Markdown only inside explicitly allowed directories", async () => {
    const root = await createTemporaryDirectory();
    await mkdir(join(root, "allowed"));
    await mkdir(join(root, "excluded"));
    await writeFile(join(root, "allowed", "README.md"), "# Allowed");
    await writeFile(join(root, "allowed", "book.pdf"), "pdf");
    await writeFile(join(root, "excluded", "README.md"), "# Excluded");

    const files = await discoverAllowlistedMarkdownFiles(root, ["allowed"]);

    expect(files).toEqual([join(root, "allowed", "README.md")]);
  });

  it("rejects absolute allowlist entries", async () => {
    const root = await createTemporaryDirectory();

    await expect(discoverAllowlistedMarkdownFiles(root, [root])).rejects.toThrow(
      /must be relative/,
    );
  });
});

async function createTemporaryDirectory() {
  const path = await mkdtemp(join(tmpdir(), "markdown-allowlist-"));
  temporaryDirectories.push(path);
  return path;
}
