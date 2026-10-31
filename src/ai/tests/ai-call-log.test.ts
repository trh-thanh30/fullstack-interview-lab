import { describe, expect, it } from "vitest";

import { estimateCost } from "../ai-call-log";

describe("estimateCost", () => {
  it("uses configurable per-million token rates", () => {
    expect(estimateCost(
      { inputTokens: 1_000_000, outputTokens: 500_000 },
      { AI_INPUT_COST_PER_1M: "0.15", AI_OUTPUT_COST_PER_1M: "0.60" },
    )).toBe(0.45);
  });
});

