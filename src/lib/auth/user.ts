import "server-only";

import { getDatabase } from "@/db/client";
import { users } from "@/db/schema";

export async function upsertAuthenticatedUser({
  email,
  image,
  name,
}: {
  email: string;
  image?: string | null;
  name?: string | null;
}) {
  const database = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();

  const [user] = await database
    .insert(users)
    .values({
      email: normalizedEmail,
      imageUrl: image ?? null,
      name: name ?? null,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        imageUrl: image ?? null,
        name: name ?? null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id });

  if (!user) {
    throw new Error("Authenticated user could not be persisted.");
  }

  return user;
}
