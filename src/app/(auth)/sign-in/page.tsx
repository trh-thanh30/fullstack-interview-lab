import { ArrowRight, BrainCircuit, GitBranch, LockKeyhole, ShieldCheck } from "lucide-react";

import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  async function signInWithGitHub() {
    "use server";
    await signIn("github", { redirectTo: "/" });
  }

  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,oklch(0.79_0.18_142/.28),transparent_28rem),linear-gradient(to_right,oklch(1_0_0/.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/.06)_1px,transparent_1px)] bg-[size:auto,36px_36px,36px_36px]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent-strong text-ink">
            <BrainCircuit className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-extrabold">Interview Lab</p>
            <p className="text-xs font-bold tracking-[0.18em] text-paper/50 uppercase">
              Private workspace
            </p>
          </div>
        </div>
        <div className="relative max-w-2xl">
          <p className="mb-5 text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
            One seat. Zero noise.
          </p>
          <h1 className="font-heading text-7xl leading-[0.92] tracking-tight xl:text-8xl">
            Không gian luyện phỏng vấn chỉ dành cho bạn.
          </h1>
          <div className="mt-10 grid grid-cols-2 gap-8 border-t border-paper/15 pt-8 text-sm text-paper/60">
            <p>Question bank có nguồn và phiên bản.</p>
            <p>AI feedback theo rubric, không chấm cảm tính.</p>
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-paper">
              <BrainCircuit className="size-5" aria-hidden="true" />
            </span>
            <p className="font-extrabold">Interview Lab</p>
          </div>
          <div className="mb-8 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
            <LockKeyhole className="size-7" aria-hidden="true" />
          </div>
          <p className="text-xs font-extrabold tracking-[0.2em] text-accent-ink uppercase">
            Private access
          </p>
          <h2 className="mt-3 font-heading text-5xl leading-none tracking-tight sm:text-6xl">
            Đăng nhập để tiếp tục.
          </h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            Dùng tài khoản GitHub có email nằm trong allowlist của workspace này.
          </p>

          <form action={signInWithGitHub} className="mt-9">
            <Button className="h-12 w-full rounded-full text-base" size="lg" type="submit">
              <GitBranch aria-hidden="true" />
              Tiếp tục với GitHub
              <ArrowRight className="ml-auto" aria-hidden="true" />
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-foreground/10 bg-card p-4 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden="true" />
            <p>Email ngoài allowlist sẽ bị từ chối trước khi session được tạo.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
