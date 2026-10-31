import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Clock3,
  Filter,
  History,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import { questionLevelValues } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { parsePracticeSearchParams, practiceStrategyValues } from "@/practice/practice-config";
import { PracticeStore } from "@/practice/practice-store";

import { StartSessionForm } from "./start-session-form";

export default function PracticePage({ searchParams }: PageProps<"/practice">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="grid gap-8 border-b border-foreground/10 pb-9 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase"><BookOpenCheck className="size-4" />Phase 3 / MCQ practice</p>
          <h1 className="mt-3 max-w-4xl font-heading text-5xl leading-[.93] tracking-tight sm:text-7xl">Luyện như đang ở vòng screening.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">Tạo một session ổn định từ question bank đã review. Đáp án chỉ xuất hiện sau khi bạn commit lựa chọn.</p>
        </div>
        <div className="rounded-3xl bg-ink p-5 text-paper shadow-[8px_8px_0_var(--accent-strong)]">
          <p className="text-xs font-bold tracking-widest text-paper/45 uppercase">Practice protocol</p>
          <p className="mt-3 font-heading text-3xl">Choose. Commit. Learn.</p>
          <p className="mt-2 text-sm leading-6 text-paper/60">Mỗi câu chỉ submit một lần. Refresh không làm mất tiến độ.</p>
        </div>
      </header>
      <Suspense fallback={<PracticeSkeleton />}>
        <PracticeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function PracticeContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const [user, params] = await Promise.all([requireAuthenticatedUser(), searchParams]);
  const configuration = parsePracticeSearchParams(params);
  const store = new PracticeStore(getDatabase());
  const [options, available, recentSessions] = await Promise.all([
    store.getConfigurationOptions(),
    store.countAvailable(configuration),
    store.listRecentSessions(user.id),
  ]);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="rounded-[2rem]">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-extrabold tracking-[.15em] text-accent-ink uppercase">Session builder</p><CardTitle className="mt-1 text-3xl">Chọn phạm vi muốn luyện</CardTitle></div>
            <SlidersHorizontal className="size-7 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" method="get">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select className={selectClass} defaultValue={configuration.topicId ?? ""} name="topicId">
                  <option value="">Tất cả category</option>
                  {options.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                </select>
              </Field>
              <Field label="Level">
                <select className={selectClass} defaultValue={configuration.level ?? ""} name="level">
                  <option value="">Tất cả level</option>
                  {questionLevelValues.map((level) => <option key={level} value={level}>{label(level)}</option>)}
                </select>
              </Field>
              <Field label="Số câu">
                <select className={selectClass} defaultValue={String(configuration.questionCount)} name="questionCount">
                  {[1, 3, 5, 10, 15, 20, 30, 50].map((count) => <option key={count} value={count}>{count} câu</option>)}
                </select>
              </Field>
              <Field label="Selection strategy">
                <select className={selectClass} defaultValue={configuration.strategy} name="strategy">
                  {practiceStrategyValues.map((strategy) => <option key={strategy} value={strategy}>{strategy === "random" ? "Random" : "Ưu tiên chưa làm / từng sai"}</option>)}
                </select>
              </Field>
            </div>

            <fieldset>
              <legend className="text-xs font-extrabold tracking-wide text-muted-foreground uppercase">Technologies</legend>
              <div className="mt-3 flex max-h-52 flex-wrap gap-2 overflow-y-auto rounded-2xl border bg-muted/25 p-3">
                {options.technologies.map((technology) => (
                  <label className="cursor-pointer" key={technology.id}>
                    <input className="peer sr-only" defaultChecked={configuration.technologyIds.includes(technology.id)} name="technologyIds" type="checkbox" value={technology.id} />
                    <span className="inline-flex rounded-full border bg-background px-3 py-1.5 text-xs font-bold transition peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background">{technology.name}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Chọn nhiều technology sẽ lấy câu khớp ít nhất một lựa chọn.</p>
            </fieldset>

            <button className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-fit rounded-xl")} type="submit"><Filter />Cập nhật số câu khả dụng</button>
          </form>
        </CardContent>
      </Card>

      <aside className="space-y-5">
        <Card className="rounded-[2rem] bg-accent-soft ring-accent-strong/30">
          <CardHeader><p className="text-xs font-extrabold tracking-widest text-accent-ink uppercase">Available now</p><CardTitle className="font-heading text-6xl">{available}</CardTitle><p className="text-sm text-muted-foreground">MCQ published khớp cấu hình hiện tại.</p></CardHeader>
          <CardContent><StartSessionForm available={available} configuration={configuration} /></CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-4" />Session gần đây</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentSessions.length ? recentSessions.map((session) => {
              const completed = session.state === "completed";
              return (
                <Link className="group flex items-center gap-3 rounded-xl border p-3 transition hover:bg-muted/60" href={completed ? `/practice/session/${session.id}/result` : `/practice/session/${session.id}`} key={session.id}>
                  {completed ? <BarChart3 className="size-4 text-accent-ink" /> : <Clock3 className="size-4 text-amber-600" />}
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{completed ? "Đã hoàn thành" : "Tiếp tục session"}</span><span className="block text-xs text-muted-foreground">{session.questionCount} câu · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(session.createdAt)}</span></span>
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </Link>
              );
            }) : <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Chưa có session nào.</p>}
          </CardContent>
        </Card>

        <div className="flex gap-3 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground"><Sparkles className="mt-0.5 size-4 shrink-0 text-accent-ink" /><p>Strategy “ưu tiên” đưa câu từng sai lên trước, sau đó tới câu chưa làm.</p></div>
      </aside>
    </div>
  );
}

function Field({ label: fieldLabel, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-xs font-extrabold tracking-wide text-muted-foreground uppercase"><span>{fieldLabel}</span>{children}</label>;
}

const selectClass = "h-11 w-full rounded-xl border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function PracticeSkeleton() {
  return <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]"><Skeleton className="h-[38rem] rounded-[2rem]" /><Skeleton className="h-[28rem] rounded-[2rem]" /></div>;
}
