// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const protectedActionFiles = [
  "src/app/(protected)/coding/actions.ts",
  "src/app/(protected)/design/actions.ts",
  "src/app/(protected)/essay/actions.ts",
  "src/app/(protected)/interview/actions.ts",
  "src/app/(protected)/learn/actions.ts",
  "src/app/(protected)/practice/actions.ts",
  "src/app/(protected)/review/actions.ts",
  "src/app/(protected)/settings/privacy/actions.ts",
];

describe("private application security architecture", () => {
  it.each(protectedActionFiles)("%s authenticates inside the Server Action module", async (file) => {
    const source = await readFile(join(process.cwd(), file), "utf8");
    expect(source).toMatch(/requireAuthenticatedUser\(\)/);
  });

  it("private route handlers authenticate before reading data", async () => {
    for (const file of ["src/app/api/design-attachments/[id]/route.ts", "src/app/api/privacy/export/route.ts"]) {
      const source = await readFile(join(process.cwd(), file), "utf8");
      expect(source).toMatch(/getAuthenticatedUser\(\)/);
    }
  });

  it("sets baseline browser security headers", async () => {
    const source = await readFile(join(process.cwd(), "next.config.ts"), "utf8");
    for (const header of ["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security"]) {
      expect(source).toContain(header);
    }
  });

  it("marks every AI-controlled user/source payload as untrusted data", async () => {
    const files = [
      "src/questions/gemini-question-generation-provider.ts",
      "src/essay/evaluator.ts",
      "src/mock-interview/adaptive-decision.ts",
      "src/system-design/evaluator.ts",
      "src/coding/coding-review.ts",
      "src/learning/plan-narrator.ts",
    ];
    for (const file of files) {
      const source = await readFile(join(process.cwd(), file), "utf8");
      expect(source).toMatch(/untrusted (?:reference material|data)/i);
    }
  });
});
