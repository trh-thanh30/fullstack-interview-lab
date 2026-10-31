import { describe, expect, it, vi } from "vitest";

import type { AiProvider } from "@/ai/provider";

import { decideNextInterviewStep } from "../adaptive-decision";

const logger = { write: vi.fn(async () => undefined) };

describe("adaptive interview decision", () => {
  it("uses rules without calling AI when score is strong", async () => {
    const provider = fakeProvider({ action: "follow_up", rationale: "x", followUpQuestion: "Why?" });
    const result = await decideNextInterviewStep(base(provider, { score: 90 }));
    expect(result.action).toBe("next_question");
    expect(provider.generateStructured).not.toHaveBeenCalled();
  });

  it("accepts a bounded structured follow-up", async () => {
    const provider = fakeProvider({ action: "follow_up", rationale: "Thiếu trade-off", followUpQuestion: "Trade-off của lựa chọn này là gì?" });
    const result = await decideNextInterviewStep(base(provider));
    expect(result).toMatchObject({ action: "follow_up", followUpQuestion: "Trade-off của lựa chọn này là gì?" });
  });

  it("falls back deterministically when the provider fails", async () => {
    const provider = fakeProvider(null);
    const result = await decideNextInterviewStep(base(provider));
    expect(result).toEqual({ action: "next_question", rationale: "deterministic-fallback", followUpQuestion: null });
  });
});

function base(provider: AiProvider, override: { score?: number } = {}) {
  return { provider, logger, question: "Explain Node streams", answer: "A shallow answer about streams.", score: override.score ?? 45, missingPoints: ["Backpressure"], suggestedFollowUp: "Backpressure là gì?", remainingFollowUps: 1 };
}

function fakeProvider(output: { action: "follow_up" | "next_question"; rationale: string; followUpQuestion: string | null } | null): AiProvider {
  return {
    name: "fake",
    model: "fake-model",
    generateStructured: vi.fn(async (input) => {
      if (!output) throw new Error("offline");
      return { correlationId: input.correlationId, providerResponseId: "response-1", model: "fake-model", output: output as never, usage: { inputTokens: 10, outputTokens: 4 }, latencyMs: 5 };
    }),
  };
}
