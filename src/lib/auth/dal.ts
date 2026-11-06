import "server-only";

import { connection } from "next/server";

import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/auth/allowlist";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export class UnauthorizedError extends Error {
  constructor() {
    super("Authentication is required to access this resource.");
    this.name = "UnauthorizedError";
  }
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  // Auth.js evaluates JWT/session expiry using the current time. With Cache
  // Components enabled, explicitly defer that work until a real request exists.
  await connection();
  const session = await auth();
  const sessionUser = session?.user;

  if (!sessionUser?.id || !sessionUser.email || !isAllowedEmail(sessionUser.email)) {
    return null;
  }

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    image: sessionUser.image ?? null,
    name: sessionUser.name ?? null,
  };
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}
