import { ArrowLeft, CheckCircle2, RefreshCcw, Target, Timer, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { PracticeStore } from "@/practice/practice-store";

import { retryWrongAnswersAction } from "../../../actions";

export function generateStaticParams() {
  return [{ id: "00000000-0000-4000-8000-000000000000" }];
}

export default function PracticeResultPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/practice"><ArrowLeft />Practice</Link>
      <Suspense fallback={<Skeleton className="mt-7 h-[46rem] rounded-[2rem]" />}>
        <ResultContent params={params} />
      </Suspense>
    </main>
  );
}

async function ResultContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const [{ id }, user] = await Promise.all([params, requireAuthenticatedUser()]);
  const result = await new PracticeStore(getDatabase()).getResult(user.id, id);
  if (!result) notFound();
  if (result.state !== "completed") redirect(`/practice/session/${id}`);
  const accuracy = result.total ? Math.round((result.correct / result.total) * 100) : 0;
  const retryAction = retryWrongAnswersAction.bind(null, id);

  return (
    <div className="mt-7">
      <header className="grid overflow-hidden rounded-[2rem] bg-ink text-paper lg:grid-cols-[1fr_23rem]">
        <div className="p-7 sm:p-10">
          <p className="text-xs font-extrabold tracking-[.2em] text-accent-strong uppercase">Session debrief</p>
          <h1 className="mt-4 font-heading text-5xl leading-none sm:text-7xl">{accuracy}% accuracy.</h1>
          <p className="mt-5 max-w-xl text-paper/60">Bạn trả lời đúng {result.correct}/{result.total} câu. Điểm được tính hoàn toàn từ answer snapshot trên server.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {result.wrong.length ? <form action={retryAction}><button className={cn(buttonVariants({ size: "lg" }), "h-11 bg-accent-strong text-ink hover:bg-accent-strong/85")} type="submit"><RefreshCcw />Luyện lại {result.wrong.length} câu sai</button></form> : <Link className={cn(buttonVariants({ size: "lg" }), "h-11 bg-accent-strong text-ink hover:bg-accent-strong/85")} href="/practice">Tạo session mới</Link>}
            <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 border-paper/20 bg-transparent text-paper hover:bg-paper/10 hover:text-paper")} href="/practice">Về practice</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-paper/10 lg:grid-cols-1">
          <Metric icon={<Target />} label="Correct" value={`${result.correct}/${result.total}`} />
          <Metric icon={<Timer />} label="Duration" value={formatDuration(result.durationMs)} />
        </div>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card className="h-fit rounded-3xl">
          <CardHeader><CardTitle className="text-2xl">Theo category</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {result.topics.map((topic) => {
              const percentage = Math.round((topic.correct / topic.total) * 100);
              return <div key={topic.topicName}><div className="flex justify-between gap-3 text-sm font-bold"><span>{topic.topicName}</span><span>{topic.correct}/{topic.total}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-accent-strong" style={{ width: `${percentage}%` }} /></div></div>;
            })}
          </CardContent>
        </Card>

        <div>
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold tracking-[.16em] text-accent-ink uppercase">Review mistakes</p><h2 className="mt-1 font-heading text-4xl">{result.wrong.length ? `${result.wrong.length} câu cần xem lại` : "Không có câu sai"}</h2></div>{result.wrong.length ? <Badge variant="destructive">Focus here</Badge> : <CheckCircle2 className="size-9 text-emerald-600" />}</div>
          <div className="mt-5 space-y-4">
            {result.wrong.length ? result.wrong.map((question, index) => (
              <Card className="rounded-2xl" key={question.id}>
                <CardHeader className="border-b"><div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10 font-heading text-destructive">{index + 1}</span><div><Badge variant="outline">{question.topicName}</Badge><CardTitle className="mt-2 text-xl leading-7">{question.prompt}</CardTitle></div></div></CardHeader>
                <CardContent><div className="flex gap-3"><XCircle className="mt-1 size-4 shrink-0 text-destructive" /><p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{question.explanation || "Câu hỏi chưa có explanation."}</p></div>{question.sources.length ? <div className="mt-4 border-t pt-3 text-xs text-muted-foreground"><strong>Nguồn:</strong> {question.sources.map((source) => `${source.sourceTitle}${source.heading ? ` — ${source.heading}` : ""}${source.pageNumber ? `, trang ${source.pageNumber}` : ""}`).join("; ")}</div> : null}</CardContent>
              </Card>
            )) : <Card className="rounded-3xl border-dashed py-14"><CardContent className="text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-600" /><p className="mt-4 font-heading text-3xl">Perfect run.</p><p className="mt-2 text-muted-foreground">Hãy thử level hoặc technology khác.</p></CardContent></Card>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-4 p-6 lg:p-8"><span className="text-accent-strong [&_svg]:size-5">{icon}</span><span><span className="block text-xs font-bold tracking-widest text-paper/40 uppercase">{label}</span><span className="mt-1 block font-heading text-3xl">{value}</span></span></div>;
}

function formatDuration(milliseconds: number) {
  const seconds = Math.round(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
