import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, CircleAlert, Target } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { MockInterviewStore } from "@/mock-interview/mock-interview-store";
import { buildInterviewReport } from "@/mock-interview/report";

export function generateStaticParams() {
  return [{ id: "00000000-0000-4000-8000-000000000000" }];
}

export default function InterviewReportPage({ params }: { params: Promise<{ id: string }> }) {
  return <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><header><Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/interview"><ArrowLeft />Interview history</Link><p className="mt-7 flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase"><BarChart3 className="size-4" />Final interview report</p><h1 className="mt-2 font-heading text-5xl sm:text-7xl">Evidence, không phải cảm giác.</h1><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Mọi con số dưới đây là phép tổng hợp từ evaluation từng answer. Report không gọi AI để tạo score mới.</p></header><Suspense fallback={<Skeleton className="mt-8 h-[60rem] rounded-[2rem]" />}><ReportContent params={params} /></Suspense></main>;
}

async function ReportContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const [{ id }, user] = await Promise.all([params, requireAuthenticatedUser()]);
  const result = await new MockInterviewStore(getDatabase()).getReport(user.id, id);
  if (!result) notFound();
  if (!["summary", "completed", "abandoned"].includes(result.session.state)) redirect(`/interview/session/${id}`);
  const reportTurns = result.turns.flatMap((turn) => turn.answer && turn.evaluation ? [{ id: turn.id, topicName: turn.topicNameSnapshot, prompt: turn.promptSnapshot, answerId: turn.answer.id, score: turn.evaluation.score, dimensions: turn.evaluation.dimensions, strengths: turn.evaluation.strengths, missingPoints: turn.evaluation.missingPoints, incorrectClaims: turn.evaluation.incorrectClaims }] : []);
  const report = buildInterviewReport(reportTurns);

  return <div className="mt-8 space-y-6">
    <section className="grid gap-4 md:grid-cols-[18rem_1fr]"><Card className="grid min-h-64 place-items-center rounded-[2rem] bg-foreground text-background"><CardContent className="text-center"><p className="text-xs font-black tracking-[.18em] text-background/50 uppercase">Average score</p><p className="mt-2 font-heading text-8xl tabular-nums">{Math.round(report.overallScore)}</p><p className="mt-2 text-sm text-background/60">{report.evaluatedCount} answer được đánh giá</p></CardContent></Card><Card className="rounded-[2rem]"><CardHeader><CardTitle className="font-heading text-3xl">Score theo dimension</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{Object.entries(report.dimensionScores).map(([name, score]) => <div className="rounded-2xl border p-4" key={name}><div className="flex justify-between gap-3"><span className="text-xs font-black tracking-wide uppercase">{name}</span><strong className="tabular-nums">{Math.round(score)}</strong></div><Progress className="mt-3" value={score} /></div>)}</CardContent></Card></section>
    <section className="grid gap-6 lg:grid-cols-2"><ReportList icon={<CheckCircle2 className="text-emerald-600" />} items={report.strengths} title="Điểm mạnh" /><ReportList icon={<Target className="text-amber-600" />} items={report.gaps} title="Lỗ hổng cần bù" />{report.incorrectClaims.length ? <div className="lg:col-span-2"><ReportList icon={<CircleAlert className="text-destructive" />} items={report.incorrectClaims} title="Claim cần xem lại" /></div> : null}</section>
    <Card className="rounded-[2rem] bg-accent-soft"><CardHeader><p className="text-xs font-black tracking-widest text-accent-ink uppercase">Next practice set</p><CardTitle className="font-heading text-4xl">Tập trung vào {report.recommendation.topicNames.join(" + ") || "các topic chưa đủ dữ liệu"}</CardTitle></CardHeader><CardContent><p className="text-sm leading-7 text-muted-foreground">Đề xuất {report.recommendation.questionCount} câu, ưu tiên {report.recommendation.dimensions.join(" và ") || "coverage rộng"}. Đây là rule từ các score thấp nhất, không phải score AI mới.</p><div className="mt-5 flex flex-wrap gap-3"><Link className={buttonVariants()} href="/practice">Tạo MCQ practice <ArrowRight /></Link><Link className={buttonVariants({ variant: "outline" })} href="/essay">Luyện essay theo topic</Link></div></CardContent></Card>
    <section><div className="flex items-end justify-between"><div><p className="text-xs font-black tracking-widest text-accent-ink uppercase">Traceability</p><h2 className="font-heading text-4xl">Từng answer và evaluation</h2></div><span className="text-sm font-bold text-muted-foreground">{result.turns.length} turns</span></div><div className="mt-4 space-y-4">{result.turns.map((turn, index) => <Card className="rounded-3xl" id={`turn-${turn.id}`} key={turn.id}><CardContent className="grid gap-5 p-5 md:grid-cols-[3rem_1fr_7rem]"><span className="font-heading text-4xl text-muted-foreground/40">{String(index + 1).padStart(2, "0")}</span><div><span className="text-xs font-black tracking-wide text-accent-ink uppercase">{turn.topicNameSnapshot}{turn.followUpNumber ? ` · Follow-up ${turn.followUpNumber}` : ""}</span><h3 className="mt-2 text-lg font-bold">{turn.promptSnapshot}</h3><p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">{turn.answer?.answerText || "Không có answer đã submit."}</p>{turn.evaluation ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><MiniList label="Strengths" values={turn.evaluation.strengths} /><MiniList label="Missing" values={turn.evaluation.missingPoints} /></div> : <p className="mt-3 text-xs font-bold text-amber-700">Không có evaluation do AI request không hoàn tất.</p>}</div><div className="text-right"><span className="font-heading text-5xl tabular-nums">{turn.evaluation ? Math.round(turn.evaluation.score) : "—"}</span><p className="text-xs font-bold text-muted-foreground">evaluation score</p></div></CardContent></Card>)}</div></section>
  </div>;
}

function ReportList({ icon, items, title }: { icon: React.ReactNode; items: Array<{ text: string; turnId: string }>; title: string }) {
  return <Card className="rounded-[2rem]"><CardHeader><CardTitle className="flex items-center gap-2 font-heading text-3xl">{icon}{title}</CardTitle></CardHeader><CardContent><ul className="space-y-3">{items.length ? items.map((item, index) => <li className="flex gap-3 text-sm leading-6" key={`${item.text}-${index}`}><span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><div><p>{item.text}</p><a className="text-xs font-bold text-accent-ink hover:underline" href={`#turn-${item.turnId}`}>Xem evidence</a></div></li>) : <li className="text-sm text-muted-foreground">Chưa đủ evaluation để tổng hợp.</li>}</ul></CardContent></Card>;
}

function MiniList({ label, values }: { label: string; values: string[] }) {
  return <div><p className="text-[10px] font-black tracking-widest uppercase">{label}</p><ul className="mt-1 space-y-1 text-xs text-muted-foreground">{values.slice(0, 3).map((value) => <li key={value}>• {value}</li>)}</ul></div>;
}
