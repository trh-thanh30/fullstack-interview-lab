// @vitest-environment node

import { describe, expect, it } from "vitest";

import { parsePdfTextIntoChunks } from "../pdf-parser";

describe("PDF text parser", () => {
  it("preserves page numbers while removing repeated headers and page footers", () => {
    const raw = [
      page("System Design Handbook", "Caching", "Cache reduces database load.", "1"),
      page("System Design Handbook", "Message Queue", "- Producer\n- Consumer", "2"),
      page("System Design Handbook", "Load Balancer", "    GET /health\n    HTTP 200", "3"),
    ].join("\f");

    const chunks = parsePdfTextIntoChunks(raw, "/books/system-design.pdf");

    expect(chunks).toHaveLength(3);
    expect(chunks.map((chunk) => chunk.pageNumber)).toEqual([1, 2, 3]);
    expect(chunks[0]?.heading).toBe("Caching");
    expect(chunks[0]?.content).not.toContain("System Design Handbook");
    expect(chunks[1]?.content).toContain("- Producer\n- Consumer");
    expect(chunks[2]?.content).toContain("    GET /health\n    HTTP 200");
    expect(chunks[2]?.metadata.breadcrumb).toContain("page 3 > Load Balancer");
  });

  it("flags pages with very little extracted text for review", () => {
    const chunks = parsePdfTextIntoChunks("Cover image");

    expect(chunks[0]?.metadata.reviewRequired).toBe(true);
    expect(chunks[0]?.metadata.reviewReason).toContain("very_little_text");
  });

  it("skips blank pages without shifting the original page number", () => {
    const chunks = parsePdfTextIntoChunks("\fArchitecture\n\nUseful page content with enough words.");

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.pageNumber).toBe(2);
  });
});

function page(header: string, heading: string, body: string, pageNumber: string) {
  return `${header}\n\n${heading}\n\n${body}\n\n${pageNumber}`;
}
