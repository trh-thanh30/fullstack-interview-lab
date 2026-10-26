import { describe, expect, it } from "vitest";

import { classifySourceChunk, normalizeTechnologyName } from "../content-taxonomy";

describe("content taxonomy", () => {
  it.each(["Node", "NodeJS", "Node.js", "node js"])(
    "normalizes the %s alias to the canonical technology slug",
    (alias) => {
      expect(normalizeTechnologyName(alias)).toBe("nodejs");
    },
  );

  it("classifies category, technologies, level and content type deterministically", () => {
    const classification = classifySourceChunk({
      id: "chunk-1",
      heading: "Senior Node.js API interview questions",
      content: "How does an Express middleware pipeline work?\n```ts\napp.use(handler)\n```",
      sourceTitle: "Backend interview",
      sourceUri: "file:///backend.md",
    });

    expect(classification).toMatchObject({
      chunkId: "chunk-1",
      topicSlug: "backend",
      level: "senior",
      contentType: "mixed",
    });
    expect(classification.technologySlugs).toEqual(
      expect.arrayContaining(["nodejs", "express"]),
    );
  });
});
