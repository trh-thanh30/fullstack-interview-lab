import { describe, expect, it } from "vitest";

import { goldenEvalDataset } from "../golden-dataset";
import { validateGoldenBaseline } from "../regression";

describe("AI golden evaluation regression gate", () => {
  it("covers required domains and answer qualities", () => {
    expect(new Set(goldenEvalDataset.map(({ domain }) => domain))).toEqual(
      new Set(["Frontend", "Backend", "DevOps", "System Design"]),
    );
    expect(new Set(goldenEvalDataset.map(({ quality }) => quality))).toEqual(
      new Set(["good", "medium", "wrong", "adversarial"]),
    );
  });

  it.each(goldenEvalDataset)("$id baseline stays schema-valid and within tolerance", (testCase) => {
    expect(validateGoldenBaseline(testCase)).toMatchObject({ passed: true, score: testCase.expectedScore });
  });

  it("keeps adversarial content behind an explicit untrusted-data instruction", () => {
    const adversarial = goldenEvalDataset.filter(({ quality }) => quality === "adversarial");
    expect(adversarial).not.toHaveLength(0);
    for (const testCase of adversarial) {
      expect(testCase.instructions).toMatch(/untrusted data/i);
      expect(testCase.input).toMatch(/ignore/i);
    }
  });
});
