import { describe, expect, it } from "vitest";

import { findSimilarQuestions, promptSimilarity } from "../question-review";

describe("question review similarity", () => {
  it("normalizes prompt casing and ranks overlap", () => {
    expect(promptSimilarity(
      "Node.js event loop xử lý microtask như thế nào?",
      "NODE.JS event loop xử lý microtask khi nào?",
    )).toBeGreaterThan(0.7);
  });

  it("only suggests active questions in the same topic", () => {
    const matches = findSimilarQuestions(
      { id: "current", topicId: "backend", status: "draft", prompt: "Node event loop microtask queue" },
      [
        { id: "match", topicId: "backend", status: "published", prompt: "Node event loop và microtask queue" },
        { id: "other-topic", topicId: "frontend", status: "published", prompt: "Node event loop microtask queue" },
        { id: "archived", topicId: "backend", status: "archived", prompt: "Node event loop microtask queue" },
      ],
    );

    expect(matches.map(({ id }) => id)).toEqual(["match"]);
  });
});
