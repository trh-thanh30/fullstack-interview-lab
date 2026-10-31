import { BookOpenCheck, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { MainNavigation } from "@/components/main-navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMenu } from "@/components/user-menu";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_8%_0%,oklch(0.88_0.13_155/.26),transparent_28rem),linear-gradient(to_right,oklch(0.3_0.02_250/.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.3_0.02_250/.06)_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px]" />
      <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-6 sm:px-6 lg:px-8">
          <Link className="group flex min-w-fit items-center gap-3" href="/">
            <span className="grid size-9 place-items-center rounded-xl bg-foreground text-background shadow-[3px_3px_0_var(--accent-strong)] transition-transform group-hover:-translate-y-0.5">
              <BrainCircuit className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden md:block">
              <span className="block text-sm font-extrabold tracking-tight">Interview Lab</span>
              <span className="block text-[10px] font-bold tracking-[0.22em] text-muted-foreground uppercase">
                Fullstack practice
              </span>
            </span>
          </Link>
          <MainNavigation />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-foreground/10 bg-card px-3 py-1.5 text-xs font-bold lg:flex">
              <BookOpenCheck className="size-3.5 text-accent-strong" aria-hidden="true" />
              MCQ MVP
            </div>
            <Suspense fallback={<Skeleton className="h-10 w-36 rounded-full" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
