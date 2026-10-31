import { describe, expect, it } from "vitest";

import { normalizeEvaluation, type EssayEvaluationOutput } from "../evaluator";

const output: EssayEvaluationOutput = {
  score: 99,
  dimensions: {
    correctness: { score: 80, feedback: "Đúng phần chính." },
    completeness: { score: 60, feedback: "Thiếu edge case." },
    clarity: { score: 90, feedback: "Rõ ràng." },
    practical: { score: 40, feedback: "Thiếu ví dụ production." },
  },
  strengths: ["Nắm core concept"],
  missingPoints: ["Cleanup"],
  incorrectClaims: ["Claim sai"],
  uncertainty: null,
  suggestedAnswer: "Reference",
  followUpQuestion: "Khi nào cleanup chạy?",
};

const rubric = [
  { key: "correctness", label: "Correctness", description: "", weight: 40 },
  { key: "completeness", label: "Completeness", description: "", weight: 30 },
  { key: "clarity", label: "Clarity", description: "", weight: 15 },
  { key: "practical", label: "Practical", description: "", weight: 15 },
];

describe("normalizeEvaluation", () => {
  it("calculates the weighted score on the server", () => {
    expect(normalizeEvaluation(output, rubric, true).score).toBe(69.5);
  });

  it("does not assert incorrect claims without source evidence", () => {
    const result = normalizeEvaluation(output, rubric, false);
    expect(result.incorrectClaims).toEqual([]);
    expect(result.uncertainty).toContain("Không đủ source context");
  });
});

