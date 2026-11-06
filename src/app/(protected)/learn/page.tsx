import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarClock,
  Clock3,
  Gauge,
  History,
  RotateCcw,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import {
  LearningStore,
  learningRangeValues,
  type LearningRange,
} from "@/learning/learning-store";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

import {
  resetReviewScheduleAction,
  startDailyReviewAction,
  startRecommendedPracticeAction,
} from "./actions";
import { PlanNarrator } from "./plan-narrator";

export default function LearnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="grid gap-7 border-b border-foreground/10 pb-9 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">
            <BrainCircuit className="size-4" /> Phase 7 / Learning loop
          </p>
          <h1 className="mt-3 max-w-4xl font-heading text-5xl leading-[.9] tracking-tight sm:text-7xl">
            Biến lịch sử thành buổi luyện tiếp theo.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Radar tiến độ gom session, rubric và lịch ôn thành một quyết định có thể giải thích.
          </p>
        </div>
        <nav aria-label="Khoảng thời gian" className="flex rounded-full border bg-card p-1">
          {learningRangeValues.map((value) => (
            <RangeLink key={value} value={value} />
          ))}
        </nav>
      </header>
      <Suspense fallback={<LearningSkeleton />}>
        <LearningContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LearningContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const [user, params] = await Promise.all([requireAuthenticatedUser(), searchParams]);
  const range = parseRange(params.range);
  const store = new LearningStore(getDatabase());
  const [dashboard, recommendations, queue] = await Promise.all([
    store.getDashboard(user.id, range),
    store.getRecommendations(user.id),
    store.getDailyQueue(user.id),
  ]);
  const empty = dashboard.summary.sessions === 0;

  if (empty) {
    return (
      <section className="mt-10 grid min-h-[32rem] place-items-center rounded-[2rem] border border-dashed bg-card p-8 text-center">
        <div className="max-w-xl">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
            <TrendingUp className="size-6" />
          </span>
          <p className="mt-6 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">No signal yet</p>
          <h2 className="mt-2 font-heading text-5xl">Radar cần buổi luyện đầu tiên.</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Hoàn thành một MCQ, self-answer hoặc mock interview. Session abandoned sẽ không được tính vào tiến độ.
          </p>
          <Link className={cn(buttonVariants({ size: "lg" }), "mt-7 rounded-full")} href="/practice">
            Bắt đầu practice <ArrowRight />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="mt-9 space-y-12">
      <section aria-labelledby="pulse-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">Learning pulse</p>
            <h2 className="mt-1 text-2xl font-extrabold" id="pulse-title">Tín hiệu trong {rangeLabel(range)}</h2>
          </div>
          <p className="hidden text-xs font-bold text-muted-foreground sm:block">Không tính session abandoned</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={History} label="Session hoàn thành" value={String(dashboard.summary.sessions)} />
          <Metric icon={Clock3} label="Thời gian luyện" value={formatMinutes(dashboard.summary.totalMinutes)} />
          <Metric icon={Target} label="MCQ accuracy" value={dashboard.summary.accuracy === null ? "—" : `${dashboard.summary.accuracy}%`} />
          <Metric icon={Gauge} label="Answer samples" value={String(dashboard.summary.answers)} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <div className="overflow-hidden rounded-[2rem] border bg-card p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-extrabold tracking-[.15em] text-accent-ink uppercase">Score tape</p><h2 className="mt-1 text-2xl font-extrabold">Essay & interview trend</h2></div>
            <BarChart3 className="size-6 text-muted-foreground" />
          </div>
          {dashboard.trends.length ? (
            <div className="mt-8 flex h-60 items-end gap-2 overflow-x-auto border-b border-l px-3 pt-5">
              {dashboard.trends.map((point, index) => (
                <div className="group flex min-w-10 flex-1 flex-col items-center justify-end" key={`${point.date.toISOString()}-${index}`}>
                  <span className="mb-2 text-[10px] font-bold opacity-0 transition group-hover:opacity-100">{Math.round(point.score)}</span>
                  <div className={cn("w-full max-w-12 rounded-t-lg", trendTone(point.mode))} style={{ height: `${Math.max(8, point.score)}%` }} />
                  <span className="mt-2 max-w-12 truncate text-[9px] font-bold text-muted-foreground uppercase">{modeLabel(point.mode)}</span>
                </div>
              ))}
            </div>
          ) : <EmptyMini text="Chưa có rubric score trong khoảng này." />}
        </div>
        <PlanNarrator />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Breakdown title="Category" subtitle="Topic yếu ở trên" rows={dashboard.breakdown} />
        <Breakdown title="Technology" subtitle="Từ câu hỏi đã gắn tag" rows={dashboard.technologies} />
        <Breakdown title="Rubric dimensions" subtitle="Essay, mock & system design" rows={dashboard.dimensions} />
      </section>

      <section aria-labelledby="recommendations-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">Deterministic ranking</p><h2 className="mt-1 text-3xl font-extrabold" id="recommendations-title">Nên luyện gì tiếp?</h2></div>
          <p className="hidden max-w-sm text-right text-xs leading-5 text-muted-foreground sm:block">55% performance gap · 25% recency · 20% rubric gap</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {recommendations.slice(0, 4).map((item, index) => {
            const startAction = startRecommendedPracticeAction.bind(null, item.topicId);
            return (
              <article className="relative overflow-hidden rounded-[1.75rem] border bg-card p-5 sm:p-6" key={item.topicId}>
                <span className="absolute -right-2 -top-7 font-heading text-[8rem] text-foreground/5">{index + 1}</span>
                <div className="relative flex items-start justify-between gap-4">
                  <div><p className="text-xs font-extrabold tracking-widest text-muted-foreground uppercase">Weakness {item.weaknessScore}/100</p><h3 className="mt-2 font-heading text-4xl">{item.topicName}</h3></div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold", item.confidence === "low" ? "bg-amber-100 text-amber-900" : "bg-accent-soft text-accent-ink")}>{item.confidence} confidence</span>
                </div>
                <ul className="relative mt-5 space-y-2 text-sm text-muted-foreground">
                  {item.reasons.map((reason) => <li className="flex gap-2" key={reason}><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-strong" />{reason}</li>)}
                </ul>
                <form action={startAction} className="relative mt-6"><Button className="rounded-full" disabled={!item.availableQuestions} type="submit">{item.availableQuestions ? `Luyện ${Math.min(5, item.availableQuestions)} câu` : "Chưa có MCQ published"} {item.availableQuestions ? <ArrowRight /> : null}</Button></form>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="review-title" className="rounded-[2rem] border bg-[#fff0d8] p-5 text-ink sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[.65fr_1.35fr]">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] uppercase"><CalendarClock className="size-4" />Daily review</p>
            <h2 className="mt-3 font-heading text-5xl" id="review-title">{queue.length} câu đang chờ.</h2>
            <p className="mt-4 text-sm leading-6 text-ink/60">Câu overdue luôn đứng trước câu mới. Confidence sau mỗi câu điều chỉnh ease và interval.</p>
            {queue.length ? <form action={startDailyReviewAction} className="mt-6"><Button className="rounded-full" type="submit">Bắt đầu daily queue <TimerReset /></Button></form> : null}
          </div>
          <div className="space-y-2">
            {queue.length ? queue.map((item, index) => (
              <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-paper/70 p-3" key={item.questionId}>
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-ink text-xs font-extrabold text-paper">{index + 1}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.prompt}</span><span className="block text-xs text-ink/50">{item.topicName} · {item.kind === "due" ? `Due ${formatDate(item.dueAt!)}` : "Câu mới"}</span></span>
                {item.kind === "due" ? <form action={resetReviewScheduleAction.bind(null, item.questionId)}><button aria-label={`Reset lịch ${item.prompt}`} className="grid size-8 place-items-center rounded-full hover:bg-ink/10" title="Reset lịch" type="submit"><RotateCcw className="size-4" /></button></form> : <Sparkles className="size-4 text-ink/35" />}
              </div>
            )) : <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-ink/20 text-center text-sm text-ink/55">Queue trống — quay lại sau khi có MCQ published.</div>}
          </div>
        </div>
      </section>

      {dashboard.levels.length ? <section><Breakdown title="Level" subtitle="Fresher · Junior · Middle · Senior" rows={dashboard.levels} /></section> : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof History; label: string; value: string }) {
  return <article className="rounded-2xl border bg-card p-5"><div className="flex items-center justify-between"><p className="text-sm font-bold text-muted-foreground">{label}</p><Icon className="size-4 text-accent-ink" /></div><p className="mt-7 font-heading text-5xl leading-none">{value}</p></article>;
}

function Breakdown({ title, subtitle, rows }: { title: string; subtitle: string; rows: Array<{ name: string; score: number; samples: number }> }) {
  return <article className="rounded-[1.75rem] border bg-card p-5"><p className="text-xs font-extrabold tracking-widest text-accent-ink uppercase">{subtitle}</p><h3 className="mt-1 text-xl font-extrabold">{title}</h3>{rows.length ? <div className="mt-6 space-y-4">{rows.slice(0, 7).map((row) => <div key={row.name}><div className="flex justify-between gap-3 text-xs font-bold"><span className="truncate">{label(row.name)}</span><span>{row.score} · n={row.samples}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/8"><div className="h-full rounded-full bg-accent-strong" style={{ width: `${row.score}%` }} /></div></div>)}</div> : <EmptyMini text="Chưa có dữ liệu." />}</article>;
}

function RangeLink({ value }: { value: LearningRange }) {
  return <Link className="rounded-full px-3 py-2 text-xs font-extrabold text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground" href={`/learn?range=${value}`}>{value === "all" ? "All" : value}</Link>;
}

function EmptyMini({ text }: { text: string }) { return <p className="mt-6 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>; }
function parseRange(value: string | string[] | undefined): LearningRange { const raw = Array.isArray(value) ? value[0] : value; return learningRangeValues.includes(raw as LearningRange) ? raw as LearningRange : "30d"; }
function rangeLabel(range: LearningRange) { return range === "all" ? "toàn bộ lịch sử" : `${range.slice(0, -1)} ngày`; }
function formatMinutes(minutes: number) { return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function formatDate(date: Date) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(date); }
function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function modeLabel(mode: string) { return mode === "short_answer" ? "essay" : mode.replace("_", " "); }
function trendTone(mode: string) { return mode === "mock_interview" ? "bg-blue-400" : mode === "system_design" ? "bg-amber-400" : mode === "coding" ? "bg-rose-400" : "bg-accent-strong"; }
function LearningSkeleton() { return <div className="mt-9 space-y-6"><div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton className="h-36 rounded-2xl" key={index} />)}</div><Skeleton className="h-80 rounded-[2rem]" /><Skeleton className="h-96 rounded-[2rem]" /></div>; }
