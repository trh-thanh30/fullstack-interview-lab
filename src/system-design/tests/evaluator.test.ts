import { describe, expect, it, vi } from "vitest";

import type { AiProvider } from "@/ai/provider";

import { evaluateSystemDesign } from "../evaluator";

describe("system design evaluator", () => {
  it("calculates weighted score on the server and asks for assumption/trade-off reasoning", async () => {
    const provider = fakeProvider();
    const result = await evaluateSystemDesign({
      provider,
      logger: { write: vi.fn(async () => undefined) },
      problem: {
        title: "URL shortener",
        context: "Global redirects",
        functionalRequirements: ["Create link"],
        nonFunctionalRequirements: ["Low latency"],
        constraints: ["Read heavy"],
        rubric: [
          { key: "requirements", label: "Requirements", description: "", weight: 50 },
          { key: "architecture", label: "Architecture", description: "", weight: 50 },
        ],
      },
      checkpoint: "tradeoffs",
      checkpointPrompt: "Explain trade-offs",
      notes: "Use a key-value store because the access pattern is primary-key lookup.",
      previousNotes: [],
      images: [{ data: new Uint8Array([1, 2, 3]), mediaType: "image/png" }],
    });
    expect(result.output.score).toBe(75);
    expect(provider.generateStructured).toHaveBeenCalledWith(expect.objectContaining({
      instructions: expect.stringMatching(/Multiple architectures[\s\S]*assumptions[\s\S]*trade-offs/i),
      images: [expect.objectContaining({ mediaType: "image/png" })],
    }));
  });
});

function fakeProvider(): AiProvider {
  return {
    name: "fake",
    model: "fake-model",
    generateStructured: vi.fn(async (input) => ({
      correlationId: input.correlationId,
      providerResponseId: "design-1",
      model: "fake-model",
      output: {
        score: 1,
        dimensionScores: { requirements: 100, estimation: 50, architecture: 50, data: 50, scaling: 50, reliability: 50, security: 50 },
        strengths: ["Clear scope"], gaps: [], assumptions: ["Read heavy"], tradeoffs: ["Consistency vs latency"], nextQuestions: [], summary: "Reasoned design",
      } as never,
      usage: { inputTokens: 10, outputTokens: 10 }, latencyMs: 5,
    })),
  };
}
