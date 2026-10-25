"use server";

import { signOut } from "@/auth";
import { requireAuthenticatedUser } from "@/lib/auth/dal";

export async function signOutAction() {
  await requireAuthenticatedUser();
  await signOut({ redirectTo: "/sign-in" });
}
