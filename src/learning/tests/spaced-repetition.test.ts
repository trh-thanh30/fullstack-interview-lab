import { describe, expect, it } from "vitest";

import { updateReviewSchedule } from "../spaced-repetition";

describe("updateReviewSchedule", () => {
  const reviewedAt = new Date("2026-11-03T00:00:00.000Z");

  it("resets a wrong answer and schedules it for tomorrow", () => {
    const result = updateReviewSchedule({
      current: { ease: 2.6, intervalDays: 14, repetitions: 4 },
      correct: false,
      confidence: 3,
      reviewedAt,
    });

    expect(result).toMatchObject({ intervalDays: 1, repetitions: 0, quality: 2 });
    expect(result.dueAt.toISOString()).toBe("2026-11-04T00:00:00.000Z");
  });

  it("grows intervals from one to six days for confident correct answers", () => {
    const first = updateReviewSchedule({ correct: true, confidence: 3, reviewedAt });
    const second = updateReviewSchedule({
      current: first,
      correct: true,
      confidence: 3,
      reviewedAt: first.dueAt,
    });

    expect(first).toMatchObject({ intervalDays: 1, repetitions: 1, quality: 5 });
    expect(second).toMatchObject({ intervalDays: 6, repetitions: 2, quality: 5 });
  });

  it("never lowers ease below the SM-2 floor", () => {
    let current = { ease: 1.3, intervalDays: 1, repetitions: 0 };
    for (let index = 0; index < 5; index += 1) {
      current = updateReviewSchedule({ current, correct: false, confidence: 1, reviewedAt });
    }
    expect(current.ease).toBe(1.3);
  });
});
