import { ArrowLeft, ShieldX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-12">
      <section className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-foreground/10 bg-card p-8 shadow-[0_24px_80px_oklch(0.2_0.03_250/.1)] sm:p-12">
        <span className="absolute -top-20 -right-20 size-56 rounded-full border-[36px] border-destructive/10" />
        <div className="relative">
          <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldX className="size-7" aria-hidden="true" />
          </div>
          <p className="mt-8 text-xs font-extrabold tracking-[0.2em] text-destructive uppercase">
            Access denied
          </p>
          <h1 className="mt-3 font-heading text-5xl leading-none tracking-tight sm:text-7xl">
            Tài khoản này chưa được cấp quyền.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            Hãy đăng nhập bằng tài khoản GitHub có email nằm trong{" "}
            <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-sm text-foreground">
              ALLOWED_EMAILS
            </code>
            , hoặc cập nhật allowlist trên Vercel trước khi thử lại.
          </p>
          <Link
            className={cn(buttonVariants({ size: "lg" }), "mt-9 rounded-full px-5")}
            href="/sign-in"
          >
            <ArrowLeft aria-hidden="true" />
            Thử tài khoản khác
          </Link>
        </div>
      </section>
    </main>
  );
}
