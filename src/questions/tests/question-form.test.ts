import { describe, expect, it } from "vitest";

import { parseQuestionFormData } from "../question-form";

const topicId = "10000000-0000-4000-8000-000000000001";
const sourceId = "20000000-0000-4000-8000-000000000001";

describe("question form validation", () => {
  it("rejects a published MCQ without a correct choice", () => {
    const result = parseQuestionFormData(form({ type: "mcq", status: "published" }));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.state.fieldErrors?.correctChoice).toBeDefined();
  });

  it("rejects a published essay without a complete rubric", () => {
    const result = parseQuestionFormData(
      form({ type: "short_answer", status: "published", correctChoice: "0" }),
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.state.fieldErrors?.["rubric"]).toBeDefined();
  });

  it("requires a source unless a published question is manual", () => {
    const result = parseQuestionFormData(
      form({ sourceChunkIds: [], isManual: false, correctChoice: "0" }),
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.state.fieldErrors?.sourceChunkIds).toBeDefined();
  });

  it("builds choices and accepts a valid manual published MCQ", () => {
    const result = parseQuestionFormData(
      form({ sourceChunkIds: [], isManual: true, correctChoice: "1" }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.choices).toEqual([
        { content: "First answer", position: 0, isCorrect: false },
        { content: "Second answer", position: 1, isCorrect: true },
      ]);
      expect(result.data.isManual).toBe(true);
    }
  });

  it("creates the four weighted rubric dimensions for an essay", () => {
    const result = parseQuestionFormData(
      form({
        type: "system_design",
        status: "published",
        sourceChunkIds: [sourceId],
        rubric: true,
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rubric?.dimensions.map(({ key, weight }) => ({ key, weight }))).toEqual([
        { key: "correctness", weight: 40 },
        { key: "completeness", weight: 30 },
        { key: "clarity", weight: 15 },
        { key: "practical", weight: 15 },
      ]);
    }
  });
});

function form(overrides: {
  type?: string;
  status?: string;
  sourceChunkIds?: string[];
  isManual?: boolean;
  correctChoice?: string;
  rubric?: boolean;
} = {}) {
  const data = new FormData();
  data.set("topicId", topicId);
  data.set("type", overrides.type ?? "mcq");
  data.set("level", "middle");
  data.set("status", overrides.status ?? "published");
  data.set("prompt", "How does the Node.js event loop work?");
  data.set("explanation", "A reviewed explanation.");
  data.set("choice-0", "First answer");
  data.set("choice-1", "Second answer");
  data.set("correctChoice", overrides.correctChoice ?? "-1");
  for (const sourceChunkId of overrides.sourceChunkIds ?? [sourceId]) {
    data.append("sourceChunkIds", sourceChunkId);
  }
  if (overrides.isManual) data.set("isManual", "on");
  if (overrides.rubric) {
    data.set("rubricCorrectness", "Technical claims are correct.");
    data.set("rubricCompleteness", "Covers the required design areas.");
    data.set("rubricClarity", "Explains the design clearly.");
    data.set("rubricPractical", "Discusses realistic trade-offs.");
    data.set("referenceAnswer", "A reviewed reference answer.");
  }
  return data;
}
