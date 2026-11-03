import { describe, expect, it } from "vitest";
import { z } from "zod";

import { enforceAiOperationLimit } from "../limits";
import { AiProviderError } from "../provider";

describe("AI operation limits", () => {
  const base = {
    correlationId: "00000000-0000-4000-8000-000000000088",
    promptVersion: "test-v1",
    instructions: "System",
    schemaName: "test",
    schema: z.object({ ok: z.boolean() }),
  };

  it("caps output tokens per feature", () => {
    expect(enforceAiOperationLimit({ ...base, feature: "mock-adaptive-decision", input: "data", maxOutputTokens: 9_999 }).maxOutputTokens).toBe(500);
  });

  it("rejects oversized untrusted input before provider I/O with a correlation ID", () => {
    expect(() => enforceAiOperationLimit({ ...base, feature: "question-generation", input: "x".repeat(60_001) })).toThrowError(AiProviderError);
    try {
      enforceAiOperationLimit({ ...base, feature: "question-generation", input: "x".repeat(60_001) });
    } catch (error) {
      expect(error).toMatchObject({ code: "input_limit", correlationId: base.correlationId });
    }
  });

  it("rejects images for text-only operations", () => {
    expect(() => enforceAiOperationLimit({ ...base, feature: "essay-evaluation", input: "answer", images: [{ data: new Uint8Array([1]), mediaType: "image/png" }] })).toThrow(/vượt giới hạn/);
  });
});
