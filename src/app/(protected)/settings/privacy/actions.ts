"use server";

import { del } from "@vercel/blob";
import { signOut } from "@/auth";
import { getDatabase } from "@/db/client";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { PrivacyStore } from "@/privacy/privacy-store";

export type DeleteAccountState = { status: "idle" | "error"; message: string };

export async function deleteAccountAction(
  previous: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  void previous;
  const user = await requireAuthenticatedUser();
  if (formData.get("confirmation") !== "DELETE MY DATA") {
    return { status: "error", message: "Nhập chính xác DELETE MY DATA để xác nhận." };
  }
  const store = new PrivacyStore(getDatabase());
  const urls = await store.listOwnedBlobUrls(user.id);
  if (urls.length) await del(urls);
  await store.deleteUserData(user.id);
  await signOut({ redirectTo: "/sign-in?deleted=1" });
  return { status: "idle", message: "" };
}
