// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("repository module format", () => {
  it("runs TypeScript CLI scripts as ES modules", async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), "package.json"), "utf8"),
    ) as { type?: string };

    expect(packageJson.type).toBe("module");
  });
});
