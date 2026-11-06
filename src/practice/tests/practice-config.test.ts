import { describe, expect, it } from "vitest";

import {
  parsePracticeFormData,
  parsePracticeSearchParams,
  practiceQuestionCountOptions,
} from "../practice-config";

describe("practice configuration", () => {
  it("parses bounded server-side configuration", () => {
    const data = new FormData();
    data.set("questionCount", "20");
    data.set("strategy", "weak_first");
    data.set("level", "senior");

    expect(parsePracticeFormData(data)).toMatchObject({
      success: true,
      data: { questionCount: 20, strategy: "weak_first", level: "senior" },
    });
  });

  it("rejects oversized sessions and falls back for invalid query params", () => {
    const data = new FormData();
    data.set("questionCount", "201");
    data.set("strategy", "random");
    expect(parsePracticeFormData(data).success).toBe(false);

    expect(parsePracticeSearchParams({ questionCount: "oops" })).toEqual({
      topicId: undefined,
      technologyIds: [],
      level: undefined,
      questionCount: 10,
      strategy: "random",
    });
  });

  it("accepts a practice session containing 200 questions", () => {
    const data = new FormData();
    data.set("questionCount", "200");
    data.set("strategy", "random");

    expect(parsePracticeFormData(data)).toMatchObject({
      success: true,
      data: { questionCount: 200 },
    });
    expect(parsePracticeSearchParams({ questionCount: "200" })).toMatchObject({
      questionCount: 200,
    });
  });

  it("offers a 60-question session for the focused Java–MySQL exam pack", () => {
    expect(practiceQuestionCountOptions).toContain(60);
    expect(parsePracticeSearchParams({ questionCount: "60" })).toMatchObject({
      questionCount: 60,
    });
  });

  it("preserves the selected question count when all visible technologies are selected", () => {
    const technologyIds = Array.from(
      { length: 18 },
      (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );

    expect(
      parsePracticeSearchParams({
        questionCount: "50",
        strategy: "random",
        technologyIds,
      }),
    ).toMatchObject({
      questionCount: 50,
      technologyIds,
    });
  });

  it("accepts fresher as a practice level", () => {
    expect(parsePracticeSearchParams({ level: "fresher", questionCount: "50" })).toMatchObject({
      level: "fresher",
      questionCount: 50,
    });
  });
});
