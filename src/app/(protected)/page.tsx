import {
  ArrowUpRight,
  BookOpenText,
  Boxes,
  ChevronRight,
  CircleDot,
  Clock3,
  Flame,
  Play,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tracks = [
  { name: "Frontend", detail: "React · Next.js · CSS", questions: 0, tone: "bg-[#fff0d8]" },
  { name: "Backend", detail: "Node.js · NestJS · SQL", questions: 0, tone: "bg-[#dff4e8]" },
  { name: "DevOps", detail: "Docker · CI/CD · Server", questions: 0, tone: "bg-[#dceeff]" },
  { name: "Architecture", detail: "System design · Patterns", questions: 0, tone: "bg-[#f1e4ff]" },
] as const;

const metrics = [
  { label: "Câu đã luyện", value: "0", icon: Target },
  { label: "Chuỗi ngày", value: "0", icon: Flame },
  { label: "Thời gian", value: "0m", icon: Clock3 },
] as const;

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-ink px-6 py-8 text-paper shadow-[0_28px_90px_oklch(0.2_0.03_250/.16)] sm:px-10 sm:py-12 lg:grid lg:grid-cols-[1.35fr_.65fr] lg:gap-12 lg:px-14 lg:py-14">
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-paper/15 bg-paper/8 px-3 py-1.5 text-xs font-bold text-paper/75">
            <Sparkles className="size-3.5 text-accent-strong" aria-hidden="true" />
            Phòng tập kỹ thuật cá nhân
          </div>
          <h1 className="max-w-3xl font-heading text-5xl leading-[0.93] tracking-[-0.035em] text-balance sm:text-7xl lg:text-[5.5rem]">
            Luyện đúng chỗ yếu. Trả lời như đi phỏng vấn thật.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-paper/65 sm:text-lg">
            Question bank có nguồn, đánh giá theo rubric và mock interview thích ứng cho lộ
            trình Fullstack của riêng bạn.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 rounded-full bg-accent-strong px-5 text-ink hover:bg-accent-strong/90",
              )}
              href="/practice"
            >
              <Play className="fill-current" aria-hidden="true" />
              Bắt đầu luyện
            </Link>
            <Link
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 rounded-full border-paper/20 bg-paper/5 px-5 text-paper hover:bg-paper/10 hover:text-paper",
              )}
              href="/interview"
            >
              Mock interview
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="relative mt-12 min-h-52 lg:mt-0">
          <div className="absolute inset-0 rotate-2 rounded-[1.75rem] border border-paper/10 bg-paper/5" />
          <div className="absolute inset-3 -rotate-2 rounded-[1.5rem] bg-paper p-6 text-ink shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">
                  Tiếp theo
                </p>
                <h2 className="mt-2 text-xl font-extrabold">Bootstrap nền tảng</h2>
              </div>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-extrabold text-accent-ink">
                FND-001
              </span>
            </div>
            <div className="mt-8 h-2 overflow-hidden rounded-full bg-ink/8">
              <div className="h-full w-1/4 rounded-full bg-accent-strong" />
            </div>
            <div className="mt-3 flex justify-between text-xs font-bold text-muted-foreground">
              <span>Phase 0</span>
              <span>1 / 4 cards</span>
            </div>
            <div className="mt-7 flex items-center gap-3 border-t border-ink/10 pt-5 text-sm font-bold">
              <CircleDot className="size-4 text-accent-ink" aria-hidden="true" />
              Foundation đang được triển khai
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="overview-title" className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[0.18em] text-accent-ink uppercase">
              Tổng quan
            </p>
            <h2 id="overview-title" className="mt-1 text-2xl font-extrabold tracking-tight">
              Hôm nay bắt đầu từ số không
            </h2>
          </div>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Dữ liệu sẽ xuất hiện sau buổi luyện đầu tiên.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {metrics.map(({ icon: Icon, label, value }) => (
            <article className="rounded-2xl border border-foreground/10 bg-card p-5" key={label}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-muted-foreground">{label}</p>
                <span className="grid size-8 place-items-center rounded-xl bg-foreground/5">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-7 font-heading text-5xl leading-none">{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="tracks-title" className="mt-12 pb-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[0.18em] text-accent-ink uppercase">Tracks</p>
            <h2 id="tracks-title" className="mt-1 text-2xl font-extrabold tracking-tight">
              Chọn vùng kiến thức
            </h2>
          </div>
          <Link className="flex items-center gap-1 text-sm font-extrabold hover:underline" href="/review">
            Quản lý câu hỏi <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tracks.map((track, index) => (
            <Link
              className={cn(
                "group relative min-h-48 overflow-hidden rounded-2xl border border-foreground/10 p-5 transition-transform hover:-translate-y-1",
                track.tone,
              )}
              href="/practice"
              key={track.name}
            >
              <span className="absolute -right-5 -bottom-8 font-heading text-[8rem] leading-none text-ink/5">
                {index + 1}
              </span>
              <div className="relative flex h-full flex-col">
                {index === 3 ? (
                  <Boxes className="size-6" aria-hidden="true" />
                ) : (
                  <BookOpenText className="size-6" aria-hidden="true" />
                )}
                <h3 className="mt-9 text-xl font-extrabold">{track.name}</h3>
                <p className="mt-1 text-sm font-medium text-ink/60">{track.detail}</p>
                <p className="mt-auto pt-5 text-xs font-extrabold tracking-wide text-ink/55 uppercase">
                  {track.questions} câu đã duyệt
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
