import { createHash } from "node:crypto";

import type { SourceChunkDraft } from "./source-chunks";

export type MarkdownChunk = SourceChunkDraft;

type MutableSection = {
  heading: string | null;
  headingLevel: number | null;
  breadcrumb: string[];
  lines: string[];
  lineStart: number;
  lineEnd: number;
};

const atxHeadingPattern = /^(#{1,6})[\t ]+(.+?)(?:[\t ]+#+[\t ]*)?$/;
const fencedCodePattern = /^\s*(`{3,}|~{3,})(.*)$/;
const listItemPattern = /^\s*(?:[-+*]|\d+[.)])[\t ]+/;
const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)|!\[([^\]]*)\]\[([^\]]*)\]/g;

export function parseMarkdownIntoChunks(
  markdown: string,
  options: { filePath?: string } = {},
): MarkdownChunk[] {
  const normalizedMarkdown = markdown.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");

  if (!normalizedMarkdown.trim()) {
    return [];
  }

  const lines = normalizedMarkdown.split("\n");
  const sections: MutableSection[] = [];
  const headingStack: string[] = [];
  let currentSection = createSection(null, null, [], 1);
  let activeFence: { marker: string; length: number } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const lineNumber = index + 1;
    const fence = line.match(fencedCodePattern);

    if (activeFence) {
      currentSection.lines.push(line);
      currentSection.lineEnd = lineNumber;

      if (fence && fence[1]?.startsWith(activeFence.marker) && fence[1].length >= activeFence.length) {
        activeFence = null;
      }

      continue;
    }

    if (fence) {
      const fenceToken = fence[1] as string;
      activeFence = { marker: fenceToken[0] as string, length: fenceToken.length };
      currentSection.lines.push(line);
      currentSection.lineEnd = lineNumber;
      continue;
    }

    const atxHeading = line.match(atxHeadingPattern);

    if (atxHeading) {
      pushSectionIfNotEmpty(sections, currentSection);

      const headingLevel = (atxHeading[1] as string).length;
      const heading = (atxHeading[2] as string).trim();
      headingStack.splice(headingLevel - 1);
      headingStack[headingLevel - 1] = heading;
      currentSection = createSection(heading, headingLevel, compactBreadcrumb(headingStack), lineNumber);
      currentSection.lines.push(line);
      continue;
    }

    const nextLine = lines[index + 1];
    const setextLevel = line.trim() && nextLine?.match(/^\s*(=+|-+)\s*$/)?.[1]?.startsWith("=")
      ? 1
      : line.trim() && nextLine?.match(/^\s*(=+|-+)\s*$/)
        ? 2
        : null;

    if (setextLevel) {
      pushSectionIfNotEmpty(sections, currentSection);
      const heading = line.trim();
      headingStack.splice(setextLevel - 1);
      headingStack[setextLevel - 1] = heading;
      currentSection = createSection(
        heading,
        setextLevel,
        compactBreadcrumb(headingStack),
        lineNumber,
      );
      currentSection.lines.push(line, nextLine as string);
      currentSection.lineEnd = lineNumber + 1;
      index += 1;
      continue;
    }

    currentSection.lines.push(line);
    currentSection.lineEnd = lineNumber;
  }

  pushSectionIfNotEmpty(sections, currentSection);

  const uniqueChunks: MarkdownChunk[] = [];
  const checksums = new Set<string>();

  for (const section of sections) {
    const chunk = createChunk(section, uniqueChunks.length, options.filePath);

    if (!checksums.has(chunk.checksum)) {
      checksums.add(chunk.checksum);
      uniqueChunks.push(chunk);
    }
  }

  return uniqueChunks;
}

function createSection(
  heading: string | null,
  headingLevel: number | null,
  breadcrumb: string[],
  lineStart: number,
): MutableSection {
  return {
    heading,
    headingLevel,
    breadcrumb,
    lines: [],
    lineStart,
    lineEnd: lineStart,
  };
}

function pushSectionIfNotEmpty(sections: MutableSection[], section: MutableSection) {
  if (section.lines.some((line) => line.trim())) {
    sections.push(section);
  }
}

function compactBreadcrumb(headings: string[]) {
  return headings.filter((heading): heading is string => Boolean(heading));
}

function createChunk(section: MutableSection, position: number, filePath?: string): MarkdownChunk {
  const content = section.lines.join("\n").trim();
  const analysis = analyzeMarkdownBlocks(section.lines);
  const headingBreadcrumb = section.breadcrumb.join(" > ");
  const breadcrumb = [filePath, ...section.breadcrumb].filter(Boolean).join(" > ");
  const checksum = createHash("sha256")
    .update(`${headingBreadcrumb}\u0000${content}`)
    .digest("hex");

  return {
    position,
    pageNumber: null,
    heading: section.heading,
    content,
    checksum,
    metadata: {
      breadcrumb,
      filePath: filePath ?? null,
      headingBreadcrumb,
      headingLevel: section.headingLevel,
      lineStart: section.lineStart,
      lineEnd: section.lineEnd,
      paragraphCount: analysis.paragraphCount,
      listItemCount: analysis.listItemCount,
      codeBlockCount: analysis.codeBlockCount,
      imageCount: analysis.imageReferences.length,
      imageReferences: JSON.stringify(analysis.imageReferences),
      blockTypes: analysis.blockTypes.join(","),
    },
  };
}

function analyzeMarkdownBlocks(lines: string[]) {
  const blockTypes = new Set<string>();
  const imageReferences = new Set<string>();
  let paragraphCount = 0;
  let listItemCount = 0;
  let codeBlockCount = 0;
  let inParagraph = false;
  let activeFence: { marker: string; length: number } | null = null;

  for (const line of lines) {
    const fence = line.match(fencedCodePattern);

    if (activeFence) {
      if (fence && fence[1]?.startsWith(activeFence.marker) && fence[1].length >= activeFence.length) {
        activeFence = null;
      }
      continue;
    }

    if (fence) {
      const token = fence[1] as string;
      activeFence = { marker: token[0] as string, length: token.length };
      codeBlockCount += 1;
      blockTypes.add("code");
      inParagraph = false;
      continue;
    }

    imagePattern.lastIndex = 0;
    let lineHasImage = false;
    for (const match of line.matchAll(imagePattern)) {
      const reference = match[2] ?? match[4];
      if (reference) {
        imageReferences.add(reference);
        lineHasImage = true;
      }
    }

    if (line.match(atxHeadingPattern) || /^\s*(=+|-+)\s*$/.test(line)) {
      blockTypes.add("heading");
      inParagraph = false;
    } else if (listItemPattern.test(line)) {
      listItemCount += 1;
      blockTypes.add("list");
      inParagraph = false;
    } else if (!line.trim()) {
      inParagraph = false;
    } else if (!inParagraph) {
      paragraphCount += 1;
      blockTypes.add("paragraph");
      inParagraph = true;
    }

    if (lineHasImage) {
      blockTypes.add("image");
    }
  }

  return {
    paragraphCount,
    listItemCount,
    codeBlockCount,
    imageReferences: [...imageReferences],
    blockTypes: [...blockTypes],
  };
}
