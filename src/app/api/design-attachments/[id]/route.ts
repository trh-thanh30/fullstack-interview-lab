import { get } from "@vercel/blob";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { getAuthenticatedUser } from "@/lib/auth/dal";
import { SystemDesignStore } from "@/system-design/system-design-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const parsedId = z.uuid().safeParse((await params).id);
  if (!parsedId.success) return new Response("Not found", { status: 404 });
  const attachment = await new SystemDesignStore(getDatabase()).getOwnedAttachment(user.id, parsedId.data);
  if (!attachment?.blobPathname) return new Response("Not found", { status: 404 });
  const result = await get(attachment.blobPathname, { access: "private", ifNoneMatch: request.headers.get("if-none-match") ?? undefined });
  if (!result) return new Response("Not found", { status: 404 });
  if (result.statusCode === 304) return new Response(null, { status: 304, headers: { ETag: result.blob.etag } });
  return new Response(result.stream, { headers: { "Content-Type": result.blob.contentType ?? attachment.mimeType ?? "application/octet-stream", "Cache-Control": "private, max-age=300", ETag: result.blob.etag, "X-Content-Type-Options": "nosniff" } });
}
