// @vitest-environment node

import { describe, expect, it } from "vitest";

import { fullstackQuestionSeed } from "../question-seed-catalog";
import { technologySeed, topicSeed } from "../seed-data";
import { starterQuestionId } from "../seed";

describe("starter fullstack question pack", () => {
  it("contains a broad practice and interview-ready content set", () => {
    const mcq = fullstackQuestionSeed.filter((question) => question.type === "mcq");
    const interview = fullstackQuestionSeed.filter((question) => question.type === "short_answer" || question.type === "deep_dive");
    const coding = fullstackQuestionSeed.filter((question) => question.type === "coding");

    expect(fullstackQuestionSeed).toHaveLength(608);
    expect(mcq).toHaveLength(540);
    expect(interview).toHaveLength(33);
    expect(coding).toHaveLength(35);
    expect(new Set(fullstackQuestionSeed.map((question) => question.topicSlug))).toEqual(
      new Set(topicSeed.map((topic) => topic.slug)),
    );
    expect(new Set(fullstackQuestionSeed.flatMap((question) => question.technologySlugs)).size).toBeGreaterThanOrEqual(15);
  });

  it("provides a broad fresher MCQ pack across every fullstack topic", () => {
    const fresherQuestions = fullstackQuestionSeed.filter(
      (question) => question.level === "fresher",
    );

    expect(fresherQuestions).toHaveLength(365);
    expect(fresherQuestions.every((question) => question.type === "mcq")).toBe(true);
    expect(new Set(fresherQuestions.map((question) => question.topicSlug))).toEqual(
      new Set(topicSeed.map((topic) => topic.slug)),
    );
  });

  it("keeps the focused Java–MySQL exam pack separate from extended material", () => {
    const examQuestions = fullstackQuestionSeed.filter(
      (question) => question.topicSlug === "java-sql-exam",
    );
    const extendedQuestions = fullstackQuestionSeed.filter(
      (question) => question.topicSlug === "java-sql-extended",
    );

    expect(examQuestions).toHaveLength(60);
    expect(extendedQuestions).toHaveLength(34);
    expect(examQuestions.every((question) => question.type === "mcq")).toBe(true);
    expect(extendedQuestions.every((question) => question.type === "mcq")).toBe(true);
    expect(new Set(examQuestions.flatMap((question) => question.technologySlugs))).toEqual(
      new Set(["java", "jdbc", "mysql", "java-swing", "netbeans-xampp"]),
    );
  });

  it("uses unique stable keys and known taxonomy slugs", () => {
    const keys = fullstackQuestionSeed.map((question) => question.key);
    const ids = fullstackQuestionSeed.map((question) => starterQuestionId(question.key));
    const knownTechnologies = new Set<string>(
      technologySeed.map((technology) => technology.slug),
    );

    expect(new Set(keys)).toHaveLength(keys.length);
    expect(new Set(ids)).toHaveLength(ids.length);
    expect(ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))).toBe(true);
    expect(
      fullstackQuestionSeed.every((question) =>
        question.technologySlugs.every((technology) => knownTechnologies.has(technology)),
      ),
    ).toBe(true);
  });

  it("gives every MCQ exactly one correct answer", () => {
    for (const question of fullstackQuestionSeed.filter((item) => item.type === "mcq")) {
      expect(question.choices).toHaveLength(4);
      expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1);
      expect(question.choices.map((choice) => choice.position)).toEqual([0, 1, 2, 3]);
      expect(question.rubric).toBeNull();
    }
  });

  it("gives every interview question a complete weighted rubric", () => {
    for (const question of fullstackQuestionSeed.filter((item) => item.type !== "mcq")) {
      expect(question.choices).toEqual([]);
      expect(question.rubric?.referenceAnswer.length).toBeGreaterThan(40);
      expect(question.rubric?.dimensions.reduce((total, dimension) => total + dimension.weight, 0)).toBe(100);
    }
  });
});
