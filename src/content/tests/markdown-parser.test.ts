// @vitest-environment node

import { describe, expect, it } from "vitest";

import { parseMarkdownIntoChunks } from "../markdown-parser";

describe("Markdown section parser", () => {
  it("chunks by heading and preserves paragraphs, lists, images and fenced code", () => {
    const markdown = `# JavaScript

Intro paragraph.

![runtime](./assets/runtime.png)

## Event loop

- Call stack
- Task queue

\`\`\`js
const heading = "# not a heading";
console.log(heading);
\`\`\`

### Microtasks

Promise callbacks run first.`;

    const chunks = parseMarkdownIntoChunks(markdown, { filePath: "frontend/react/README.md" });

    expect(chunks).toHaveLength(3);
    expect(chunks.map((chunk) => chunk.heading)).toEqual([
      "JavaScript",
      "Event loop",
      "Microtasks",
    ]);
    expect(chunks[1]?.metadata.breadcrumb).toBe(
      "frontend/react/README.md > JavaScript > Event loop",
    );
    expect(chunks[2]?.metadata.headingBreadcrumb).toBe(
      "JavaScript > Event loop > Microtasks",
    );
    expect(chunks[0]?.metadata.imageReferences).toBe('["./assets/runtime.png"]');
    expect(chunks[1]?.metadata.listItemCount).toBe(2);
    expect(chunks[1]?.metadata.codeBlockCount).toBe(1);
    expect(chunks[1]?.content).toContain('const heading = "# not a heading";');
    expect(chunks[1]?.content).toContain("```js");
  });

  it("does not treat headings inside code fences as sections", () => {
    const chunks = parseMarkdownIntoChunks(`# Topic

~~~md
# code heading
~~~

## Real heading
Body`);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.content).toContain("# code heading");
    expect(chunks[1]?.heading).toBe("Real heading");
  });

  it("supports setext headings and stable checksums", () => {
    const markdown = `Title
=====

Body

Section
-------

More body`;
    const first = parseMarkdownIntoChunks(markdown);
    const second = parseMarkdownIntoChunks(markdown);

    expect(first.map((chunk) => chunk.heading)).toEqual(["Title", "Section"]);
    expect(second.map((chunk) => chunk.checksum)).toEqual(
      first.map((chunk) => chunk.checksum),
    );
  });

  it("preserves hashes in headings and removes exact duplicate sections", () => {
    const chunks = parseMarkdownIntoChunks(`# C# basics

## Question
Answer

## Question
Answer`);

    expect(chunks.map((chunk) => chunk.heading)).toEqual(["C# basics", "Question"]);
    expect(chunks.map((chunk) => chunk.position)).toEqual([0, 1]);
  });
});
