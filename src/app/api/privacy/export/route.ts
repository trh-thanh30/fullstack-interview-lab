import { getDatabase } from "@/db/client";
import { getAuthenticatedUser } from "@/lib/auth/dal";
import { PrivacyStore } from "@/privacy/privacy-store";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await new PrivacyStore(getDatabase()).exportUserData(user.id);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-lab-export-${stamp}.json"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
