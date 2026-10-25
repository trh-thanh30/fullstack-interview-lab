import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FeaturePlaceholder({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-66px)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="relative w-full overflow-hidden rounded-[2rem] border border-foreground/10 bg-card p-8 shadow-[0_24px_80px_oklch(0.2_0.03_250/.08)] sm:p-12 lg:p-16">
        <span className="absolute -top-14 -right-14 size-52 rounded-full border-[32px] border-accent-strong/15" />
        <div className="relative max-w-2xl">
          <div className="mb-8 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
            <Construction className="size-7" aria-hidden="true" />
          </div>
          <p className="mb-3 text-xs font-extrabold tracking-[0.2em] text-accent-ink uppercase">
            {eyebrow}
          </p>
          <h1 className="font-heading text-5xl leading-none tracking-tight sm:text-7xl">{title}</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            {description}
          </p>
          <Link
            className={cn(buttonVariants({ size: "lg" }), "mt-10 rounded-full px-5")}
            href="/"
          >
            <ArrowLeft aria-hidden="true" />
            Về dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
