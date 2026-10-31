import { ArrowRight, BrainCircuit, Clock3, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import { EssayStore } from "@/essay/essay-store";
import { requireAuthenticatedUser } from "@/lib/auth/dal";

import { startEssaySessionAction } from "./actions";

export default function EssayPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="grid gap-8 border-b border-foreground/10 pb-9 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase"><BrainCircuit className="size-4" />Phase 4 / AI essay</p>
          <h1 className="mt-3 max-w-4xl font-heading text-5xl leading-[.93] tracking-tight sm:text-7xl">Nói rõ điều bạn thật sự hiểu.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">Viết câu trả lời tự luận, nhận feedback theo rubric và source đã kiểm duyệt, rồi thử lại để đo phần tiến bộ.</p>
        </div>
        <div className="rounded-3xl bg-ink p-5 text-paper shadow-[8px_8px_0_var(--accent-strong)]">
          <p className="text-xs font-bold tracking-widest text-paper/45 uppercase">Essay protocol</p>
          <p className="mt-3 font-heading text-3xl">Explain. Verify. Refine.</p>
          <p className="mt-2 text-sm leading-6 text-paper/60">AI feedback được tách khỏi reference answer và luôn giữ lịch sử.</p>
        </div>
      </header>
      <Suspense fallback={<EssayIndexSkeleton />}><EssayIndex /></Suspense>
    </main>
  );
}

async function EssayIndex() {
  await connection();
  const user = await requireAuthenticatedUser();
  const store = new EssayStore(getDatabase());
  const [questions, recent] = await Promise.all([
    store.listPublishedQuestions(),
    store.listRecentSessions(user.id),
  ]);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-extrabold tracking-widest text-accent-ink uppercase">Published prompts</p><h2 className="font-heading text-4xl">Chọn câu muốn giải thích</h2></div>
          <span className="rounded-full border px-3 py-1 text-xs font-bold">{questions.length} available</span>
        </div>
        {questions.length ? questions.map((question, index) => (
          <Card className="group overflow-hidden rounded-3xl transition hover:-translate-y-0.5 hover:shadow-lg" key={question.id}>
            <CardContent className="grid gap-5 p-5 sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:p-6">
              <span className="font-heading text-4xl text-muted-foreground/45">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0"><div className="mb-2 flex flex-wrap gap-2"><span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-accent-ink uppercase">{question.topicName}</span><span className="rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase">{question.level}</span></div><h3 className="text-lg font-bold leading-7 break-words">{question.prompt}</h3></div>
              <form action={startEssaySessionAction}><input name="questionId" type="hidden" value={question.id} /><Button className="w-full rounded-xl sm:w-auto" type="submit">Trả lời <ArrowRight /></Button></form>
            </CardContent>
          </Card>
        )) : <div className="rounded-3xl border border-dashed p-10 text-center"><FileText className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-bold">Chưa có short-answer question đã publish.</p><p className="mt-1 text-sm text-muted-foreground">Tạo và approve câu tự luận kèm rubric trong Question bank trước.</p></div>}
      </section>

      <aside className="space-y-5">
        <Card className="rounded-3xl bg-accent-soft"><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-4" />Essay gần đây</CardTitle></CardHeader><CardContent className="space-y-2">{recent.length ? recent.map((session) => <Link className="group block rounded-xl border bg-background/70 p-3 transition hover:bg-background" href={`/essay/session/${session.id}`} key={session.id}><span className="line-clamp-2 text-sm font-bold">{session.prompt}</span><span className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>{session.attemptCount} attempt</span><ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" /></span></Link>) : <p className="text-sm text-muted-foreground">Chưa có essay session.</p>}</CardContent></Card>
        <div className="flex gap-3 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground"><Sparkles className="mt-0.5 size-4 shrink-0 text-accent-ink" /><p>Điểm được tính lại ở server theo trọng số rubric, không dùng trực tiếp tổng điểm model trả về.</p></div>
      </aside>
    </div>
  );
}

function EssayIndexSkeleton() {
  return <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]"><Skeleton className="h-[36rem] rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></div>;
}

