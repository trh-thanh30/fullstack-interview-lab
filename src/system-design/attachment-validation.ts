import { z } from "zod";

export const MAX_DIAGRAM_BYTES = 3 * 1024 * 1024;
export const allowedDiagramMimeTypes = ["image/png", "image/jpeg", "image/webp"] as const;

export function validateDiagramFile(file: File) {
  if (!allowedDiagramMimeTypes.includes(file.type as (typeof allowedDiagramMimeTypes)[number])) {
    return { success: false as const, message: "Chỉ chấp nhận PNG, JPEG hoặc WebP." };
  }
  if (file.size <= 0 || file.size > MAX_DIAGRAM_BYTES) {
    return { success: false as const, message: "Ảnh sơ đồ phải lớn hơn 0 và không vượt quá 3 MB." };
  }
  return { success: true as const, file };
}

export const mermaidAttachmentSchema = z.object({
  text: z.string().trim().min(10).max(30_000),
  altText: z.string().trim().min(5).max(500),
});
