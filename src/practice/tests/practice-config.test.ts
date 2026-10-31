import { describe, expect, it } from "vitest";

import { parsePracticeFormData, parsePracticeSearchParams } from "../practice-config";

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
    data.set("questionCount", "200");
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
});
