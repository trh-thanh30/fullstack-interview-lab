"use client";

import { ClipboardCheck, LayoutDashboard, MessagesSquare, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/practice", label: "Practice", icon: ClipboardCheck },
  { href: "/interview", label: "Interview", icon: MessagesSquare },
  { href: "/review", label: "Review", icon: Wrench },
] as const;

export function MainNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="-mx-2 overflow-x-auto px-2">
      <ul className="flex min-w-max items-center gap-1">
        {navigation.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === href : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-colors sm:text-sm",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
                href={href}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
