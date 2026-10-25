import { LogOut, UserRound } from "lucide-react";

import { signOutAction } from "@/app/(protected)/actions";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/lib/auth/dal";

export async function UserMenu() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-full border border-foreground/10 bg-card py-1.5 pr-2.5 pl-1.5 xl:flex">
        <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <UserRound className="size-3.5" aria-hidden="true" />
        </span>
        <span className="max-w-32 truncate text-xs font-bold">{user.name ?? user.email}</span>
      </div>
      <form action={signOutAction}>
        <Button aria-label="Đăng xuất" size="icon" type="submit" variant="ghost">
          <LogOut aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
