import { createHash } from "node:crypto";

import type { SourceChunkDraft } from "./source-chunks";

type PdfPage = {
  pageNumber: number;
  lines: string[];
};

const minimumRepeatedLineOccurrences = 3;

export function parsePdfTextIntoChunks(extractedText: string, filePath?: string): SourceChunkDraft[] {
  const pages = splitPages(extractedText);
  const repeatedMarginLines = findRepeatedMarginLines(pages);
  const chunks: SourceChunkDraft[] = [];

  for (const page of pages) {
    const lines = cleanPageLines(page.lines, repeatedMarginLines);
    const content = normalizePageContent(lines);

    if (!content) {
      continue;
    }

    const heading = detectPageHeading(lines);
    const quality = assessExtractionQuality(content);
    const checksum = createHash("sha256")
      .update(`${page.pageNumber}\u0000${heading ?? ""}\u0000${content}`)
      .digest("hex");

    chunks.push({
      position: chunks.length,
      pageNumber: page.pageNumber,
      heading,
      content,
      checksum,
      metadata: {
        breadcrumb: [filePath, `page ${page.pageNumber}`, heading].filter(Boolean).join(" > "),
        filePath: filePath ?? null,
        qualityScore: quality.score,
        reviewRequired: quality.reviewRequired,
        reviewReason: quality.reason,
        removedRepeatedMarginLines: page.lines.length - lines.length,
      },
    });
  }

  return chunks;
}

function splitPages(extractedText: string): PdfPage[] {
  const normalized = extractedText.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");

  return normalized.split("\f").map((page, index) => ({
    pageNumber: index + 1,
    lines: page.split("\n").map((line) => line.replace(/[\t ]+$/g, "")),
  }));
}

function findRepeatedMarginLines(pages: PdfPage[]) {
  const occurrences = new Map<string, Set<number>>();

  for (const page of pages) {
    const nonEmptyLines = page.lines
      .map((line, index) => ({ line: line.trim(), index }))
      .filter(({ line }) => line);
    const marginLines = [
      ...nonEmptyLines.slice(0, 3),
      ...nonEmptyLines.slice(Math.max(0, nonEmptyLines.length - 3)),
    ];

    for (const { line } of marginLines) {
      if (isPageNumber(line)) continue;
      const pagesForLine = occurrences.get(line) ?? new Set<number>();
      pagesForLine.add(page.pageNumber);
      occurrences.set(line, pagesForLine);
    }
  }

  const threshold = Math.max(
    minimumRepeatedLineOccurrences,
    Math.ceil(pages.filter((page) => page.lines.some((line) => line.trim())).length * 0.3),
  );

  return new Set(
    [...occurrences.entries()]
      .filter(([, pageNumbers]) => pageNumbers.size >= threshold)
      .map(([line]) => line),
  );
}

function cleanPageLines(lines: string[], repeatedMarginLines: Set<string>) {
  const nonEmptyIndexes = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) => line)
    .map(({ index }) => index);
  const marginIndexes = new Set([
    ...nonEmptyIndexes.slice(0, 3),
    ...nonEmptyIndexes.slice(Math.max(0, nonEmptyIndexes.length - 3)),
  ]);

  return lines.filter((line, index) => {
    const trimmed = line.trim();
    if (isPageNumber(trimmed)) return false;
    return !(marginIndexes.has(index) && repeatedMarginLines.has(trimmed));
  });
}

function normalizePageContent(lines: string[]) {
  const normalized: string[] = [];
  let previousBlank = true;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u00A0/g, " ");
    const isBlank = !line.trim();

    if (isBlank && previousBlank) continue;
    normalized.push(isBlank ? "" : line);
    previousBlank = isBlank;
  }

  while (normalized.at(-1) === "") normalized.pop();
  return normalized.join("\n").trim();
}

function detectPageHeading(lines: string[]) {
  const blocks: string[][] = [];
  let block: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      block.push(trimmed);
    } else if (block.length > 0) {
      blocks.push(block);
      block = [];
    }
  }
  if (block.length > 0) blocks.push(block);

  for (const candidate of blocks.slice(0, 3)) {
    const heading = candidate.join(" ");
    if (
      candidate.length <= 2 &&
      heading.length >= 3 &&
      heading.length <= 180 &&
      !/[.!?;,]$/.test(heading) &&
      !isPageNumber(heading)
    ) {
      return heading;
    }
  }

  return null;
}

function assessExtractionQuality(content: string) {
  const characters = [...content];
  const nonWhitespace = characters.filter((character) => !/\s/u.test(character));
  const readable = nonWhitespace.filter((character) => /[\p{L}\p{N}\p{P}\p{S}]/u.test(character));
  const replacementCharacters = characters.filter((character) => character === "�").length;
  const readableRatio = nonWhitespace.length === 0 ? 0 : readable.length / nonWhitespace.length;
  const replacementRatio = characters.length === 0 ? 1 : replacementCharacters / characters.length;
  const lengthScore = Math.min(1, content.length / 400);
  const score = Math.round(
    Math.max(0, Math.min(1, readableRatio * 0.55 + lengthScore * 0.35 + (1 - replacementRatio) * 0.1)) *
      100,
  );
  const reasons: string[] = [];

  if (content.length < 80) reasons.push("very_little_text");
  if (readableRatio < 0.8) reasons.push("low_readable_character_ratio");
  if (replacementRatio > 0.01) reasons.push("replacement_characters");

  return {
    score,
    reviewRequired: reasons.length > 0,
    reason: reasons.join(",") || null,
  };
}

function isPageNumber(line: string) {
  return /^(?:page\s*)?\d+(?:\s*\/\s*\d+)?$/i.test(line);
}
