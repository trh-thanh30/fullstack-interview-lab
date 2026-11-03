import { describe, expect, it } from "vitest";

import { MAX_DIAGRAM_BYTES, validateDiagramFile } from "../attachment-validation";

describe("diagram attachment validation", () => {
  it("accepts supported image MIME types within 3 MB", () => {
    expect(validateDiagramFile(new File([new Uint8Array(128)], "diagram.png", { type: "image/png" })).success).toBe(true);
  });

  it("rejects spoof-prone or oversized uploads", () => {
    expect(validateDiagramFile(new File(["<svg/>"], "diagram.svg", { type: "image/svg+xml" }))).toMatchObject({ success: false });
    expect(validateDiagramFile(new File([new Uint8Array(MAX_DIAGRAM_BYTES + 1)], "huge.webp", { type: "image/webp" }))).toMatchObject({ success: false });
  });
});
