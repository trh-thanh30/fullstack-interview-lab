// @vitest-environment node

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { checksumFile, createFileSourceInput, discoverSourceFiles } from "../file-sources";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("file sources", () => {
  it("discovers only supported files and ignores hidden directories", async () => {
    const root = await createTemporaryDirectory();
    await mkdir(join(root, "nested"));
    await mkdir(join(root, ".git"));
    await writeFile(join(root, "one.md"), "one");
    await writeFile(join(root, "nested", "two.pdf"), "two");
    await writeFile(join(root, "nested", "image.png"), "image");
    await writeFile(join(root, ".git", "hidden.md"), "hidden");

    const files = await discoverSourceFiles([root]);

    expect(files.map((path) => path.slice(root.length + 1))).toEqual([
      "nested/two.pdf",
      "one.md",
    ]);
  });

  it("creates deterministic SHA-256 metadata for a file", async () => {
    const root = await createTemporaryDirectory();
    const path = join(root, "guide.md");
    await writeFile(path, "interview guide");

    const source = await createFileSourceInput(path, "Internal use");

    expect(source.type).toBe("markdown");
    expect(source.checksum).toBe(await checksumFile(path));
    expect(source.uri).toMatch(/^file:/);
    expect(source.metadata).toMatchObject({ extension: ".md", path, sizeBytes: 15 });
  });
});

async function createTemporaryDirectory() {
  const path = await mkdtemp(join(tmpdir(), "interview-source-"));
  temporaryDirectories.push(path);
  return path;
}
