// @vitest-environment node

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverAllowlistedPdfFiles } from "../pdf-source-allowlist";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("PDF file allowlist", () => {
  it("returns only explicitly approved PDF files", async () => {
    const root = await createTemporaryDirectory();
    await writeFile(join(root, "architecture.pdf"), "pdf");
    await writeFile(join(root, "resume.pdf"), "private");

    const files = await discoverAllowlistedPdfFiles(root, ["architecture.pdf"]);

    expect(files).toEqual([join(root, "architecture.pdf")]);
  });

  it("rejects nested paths in file allowlist entries", async () => {
    const root = await createTemporaryDirectory();

    await expect(discoverAllowlistedPdfFiles(root, ["../secret.pdf"])).rejects.toThrow(
      /must be a filename/,
    );
  });
});

async function createTemporaryDirectory() {
  const path = await mkdtemp(join(tmpdir(), "pdf-allowlist-"));
  temporaryDirectories.push(path);
  return path;
}
