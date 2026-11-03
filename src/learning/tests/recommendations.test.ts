import { describe, expect, it } from "vitest";

import { rankWeakTopics } from "../recommendations";

describe("rankWeakTopics", () => {
  it("ranks from deterministic evidence and labels sparse topics low confidence", () => {
    const now = new Date("2026-11-03T00:00:00.000Z");
    const result = rankWeakTopics([
      {
        topicId: "backend",
        topicName: "Backend",
        attempts: 10,
        correct: 8,
        scoreSamples: [75, 80],
        dimensionSamples: [70, 90],
        lastPracticedAt: new Date("2026-11-02T00:00:00.000Z"),
      },
      {
        topicId: "devops",
        topicName: "DevOps",
        attempts: 1,
        correct: 0,
        scoreSamples: [],
        dimensionSamples: [],
        lastPracticedAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    ], now);

    expect(result.map(({ topicName }) => topicName)).toEqual(["DevOps", "Backend"]);
    expect(result[0]).toMatchObject({ confidence: "low", sampleSize: 1, accuracy: 0 });
    expect(result[0]?.reasons).toContain("Độ tin cậy thấp: cần ít nhất 3 mẫu");
    expect(result[0]!.weaknessScore).toBeGreaterThan(result[1]!.weaknessScore);
  });

  it("is stable when scores tie", () => {
    const evidence = ["Frontend", "Backend"].map((topicName) => ({
      topicId: topicName.toLowerCase(),
      topicName,
      attempts: 0,
      correct: 0,
      scoreSamples: [],
      dimensionSamples: [],
      lastPracticedAt: null,
    }));
    expect(rankWeakTopics(evidence).map(({ topicName }) => topicName)).toEqual([
      "Backend",
      "Frontend",
    ]);
  });
});
