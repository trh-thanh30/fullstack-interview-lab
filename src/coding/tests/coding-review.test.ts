import { describe, expect, it, vi } from "vitest";

import type { AiProvider } from "@/ai/provider";

import { reviewCodeStatically } from "../coding-review";

describe("static coding review", () => {
  it("always states that code was not executed", async () => {
    const provider = fakeProvider("Looks correct from inspection.");
    const result = await reviewCodeStatically({ provider, logger: { write: vi.fn(async () => undefined) }, question: "Deduplicate values", language: "typescript", code: "export const unique = <T>(items: T[]) => [...new Set(items)];", explanation: "Set removes duplicates.", rubric: {} });
    expect(result.output.summary).toMatch(/chưa được chạy|không được thực thi/i);
    expect(provider.generateStructured).toHaveBeenCalledWith(expect.objectContaining({ instructions: expect.stringMatching(/NOT been compiled or executed[\s\S]*Review statically/i) }));
  });
});

function fakeProvider(summary: string): AiProvider {
  return { name: "fake", model: "fake-model", generateStructured: vi.fn(async (input) => ({ correlationId: input.correlationId, providerResponseId: null, model: "fake-model", output: { score: 80, complexity: "O(n) time, O(n) space", correctnessAssumptions: ["Set equality is acceptable"], edgeCases: ["NaN"], strengths: ["Concise"], risks: [], suggestions: [], summary } as never, usage: { inputTokens: 10, outputTokens: 10 }, latencyMs: 3 })) };
}
