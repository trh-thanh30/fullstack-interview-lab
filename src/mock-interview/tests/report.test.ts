import { describe, expect, it } from "vitest";

import { buildInterviewReport } from "../report";

describe("interview report", () => {
  it("derives every aggregate from persisted turn evaluations", () => {
    const report = buildInterviewReport([
      turn("a", "Backend", 80, { correctness: 90, clarity: 70 }),
      turn("b", "DevOps", 40, { correctness: 50, clarity: 30 }),
    ]);
    expect(report.overallScore).toBe(60);
    expect(report.topicScores).toEqual({ Backend: 80, DevOps: 40 });
    expect(report.dimensionScores).toEqual({ correctness: 70, clarity: 50 });
    expect(report.weakestTopics).toEqual(["DevOps", "Backend"]);
    expect(report.recommendation.topicNames[0]).toBe("DevOps");
    expect(report.gaps[0]).toMatchObject({ turnId: "a", answerId: "answer-a" });
  });

  it("returns a stable empty report when evaluations are unavailable", () => {
    expect(buildInterviewReport([])).toMatchObject({ overallScore: 0, evaluatedCount: 0, strengths: [], gaps: [] });
  });
});

function turn(id: string, topicName: string, score: number, dimensions: Record<string, number>) {
  return { id, topicName, prompt: `Prompt ${id}`, answerId: `answer-${id}`, score, dimensions, strengths: [`Strength ${id}`], missingPoints: [`Gap ${id}`], incorrectClaims: [] };
}
