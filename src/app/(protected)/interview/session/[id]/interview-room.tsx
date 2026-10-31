"use client";

import { Check, Clock3, LoaderCircle, MessageSquareMore, Send, Signal, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

import { abandonMockInterviewAction, saveMockInterviewDraftAction, submitMockInterviewAnswerAction, type InterviewActionState } from "../../actions";

type RoomDto = {
  id: string;
  state: "answering" | "follow_up";
  version: number;
  deadlineAt: string | null;
  questionCount: number;
  baseQuestionCount: number;
  turnCount: number;
  current: { id: string; prompt: string; topicName: string; followUpNumber: number };
  draft: string;
  draftSavedAt: string | null;
  transcript: Array<{ id: string; prompt: string; answer: string }>;
};

const initialState: InterviewActionState = { status: "idle", message: "" };

export function InterviewRoom({ session }: { session: RoomDto }) {
  const router = useRouter();
  const [answerText, setAnswerText] = useState(session.draft);
  const [savedAt, setSavedAt] = useState(session.draftSavedAt);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(session.draftSavedAt ? "saved" : "idle");
  const lastSaved = useRef(session.draft);
  const [, startSaving] = useTransition();
  const [ending, startEnding] = useTransition();
  const submit = submitMockInterviewAnswerAction.bind(null, session.id, session.current.id, session.version);
  const [submitState, submitAction, pending] = useActionState(submit, initialState);

  useEffect(() => {
    if (answerText === lastSaved.current) return;
    const timer = window.setTimeout(() => startSaving(async () => {
      try {
        const result = await saveMockInterviewDraftAction(session.id, session.current.id, answerText);
        if (!result.saved) throw new Error(result.message);
        lastSaved.current = answerText;
        setSavedAt(result.savedAt ?? null);
        setSaveStatus("saved");
      } catch { setSaveStatus("error"); }
    }), 700);
    return () => window.clearTimeout(timer);
  }, [answerText, session]);

  useEffect(() => {
    if (submitState.status !== "advanced") return;
    if (submitState.nextUrl) router.push(submitState.nextUrl);
    else router.refresh();
  }, [router, submitState]);

  const endEarly = () => {
    if (!window.confirm("Kết thúc interview sớm? Draft hiện tại chưa submit sẽ không được đưa vào report.")) return;
    startEnding(async () => {
      await abandonMockInterviewAction(session.id, session.version, session.state);
      router.push("/interview");
    });
  };

  return <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
    <section className="overflow-hidden rounded-[2rem] border bg-card shadow-[0_24px_80px_-50px_var(--foreground)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-foreground px-5 py-4 text-background sm:px-7"><div className="flex items-center gap-3"><span className="relative flex size-3"><span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-strong opacity-75" /><span className="relative inline-flex size-3 rounded-full bg-accent-strong" /></span><span className="text-xs font-black tracking-[.16em] uppercase">Live interview</span></div><div className="flex items-center gap-4 text-xs font-bold"><span className="flex items-center gap-1.5"><Signal className="size-3.5" />Connected</span><Countdown deadlineAt={session.deadlineAt} /></div></div>
      <div className="p-5 sm:p-8 lg:p-10"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-extrabold text-accent-ink">{session.current.topicName}</span>{session.current.followUpNumber ? <span className="rounded-full border px-3 py-1 text-xs font-bold">Follow-up {session.current.followUpNumber}</span> : <span className="rounded-full border px-3 py-1 text-xs font-bold">Question {session.baseQuestionCount}/{session.questionCount}</span>}</div><p className="mt-7 text-xs font-black tracking-[.16em] text-muted-foreground uppercase">Interviewer</p><h1 className="mt-3 max-w-4xl font-heading text-3xl leading-tight sm:text-5xl">{session.current.prompt}</h1>
        <form action={submitAction} className="mt-10"><div className="flex items-center justify-between gap-3"><label className="text-xs font-black tracking-[.16em] uppercase" htmlFor="mock-answer">Your answer</label><SaveStatus savedAt={savedAt} state={saveStatus} /></div><Textarea autoFocus className="mt-3 min-h-72 resize-y rounded-2xl border-2 bg-background p-5 text-base leading-7" disabled={pending} id="mock-answer" maxLength={30_000} name="answerText" onChange={(event) => { setAnswerText(event.target.value); setSaveStatus("saving"); }} placeholder="Think aloud: nêu assumption, phân tích trade-off, rồi đưa ra lựa chọn…" value={answerText} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs tabular-nums text-muted-foreground">Turn {session.turnCount} · {answerText.length.toLocaleString("vi-VN")} / 30.000</span><Button className="min-w-52 rounded-xl" disabled={pending || answerText.trim().length < 20} size="lg" type="submit">{pending ? <LoaderCircle className="animate-spin" /> : <Send />}{pending ? "Đang phân tích…" : "Gửi câu trả lời"}</Button></div>{pending ? <div aria-live="polite" className="mt-4 rounded-xl border border-accent-strong/25 bg-accent-soft/40 p-4 text-sm"><p className="font-bold text-accent-ink">Answer đã được gửi lên server.</p><p className="mt-1 text-muted-foreground">Gemini đang đánh giá và chọn follow-up. Bạn có thể chờ tại đây; không cần submit lại.</p></div> : null}{submitState.status === "error" ? <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-bold text-destructive">{submitState.message}</p> : null}</form>
      </div>
    </section>
    <aside className="space-y-5"><Card className="rounded-3xl"><CardHeader><CardTitle className="text-lg">Progress</CardTitle></CardHeader><CardContent><div className="flex items-end justify-between"><span className="font-heading text-4xl">{session.baseQuestionCount}</span><span className="text-sm font-bold text-muted-foreground">/ {session.questionCount} câu chính</span></div><Progress className="mt-3" value={Math.min(100, session.baseQuestionCount / session.questionCount * 100)} /><p className="mt-4 text-xs leading-5 text-muted-foreground">Điểm và rubric feedback sẽ chỉ xuất hiện trong final report.</p></CardContent></Card>{session.transcript.length ? <Card className="rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquareMore className="size-4" />Transcript</CardTitle></CardHeader><CardContent className="max-h-72 space-y-3 overflow-y-auto">{session.transcript.map((turn, index) => <details className="rounded-xl border p-3 text-xs" key={turn.id}><summary className="cursor-pointer font-bold">Turn {index + 1}</summary><p className="mt-2 line-clamp-3 text-muted-foreground">{turn.prompt}</p><p className="mt-2 border-t pt-2 text-muted-foreground">{turn.answer}</p></details>)}</CardContent></Card> : null}<Button className="w-full rounded-xl" disabled={ending || pending} onClick={endEarly} variant="outline"><Square />{ending ? "Đang kết thúc…" : "Kết thúc sớm"}</Button></aside>
  </div>;
}

function Countdown({ deadlineAt }: { deadlineAt: string | null }) {
  const [remaining, setRemaining] = useState(() => deadlineAt ? Math.max(0, new Date(deadlineAt).getTime() - Date.now()) : 0);
  useEffect(() => { if (!deadlineAt) return; const tick = () => setRemaining(Math.max(0, new Date(deadlineAt).getTime() - Date.now())); const interval = window.setInterval(tick, 1_000); tick(); return () => window.clearInterval(interval); }, [deadlineAt]);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor(remaining % 60_000 / 1_000);
  return <span className="flex items-center gap-1.5 font-mono tabular-nums"><Clock3 className="size-3.5" />{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>;
}

function SaveStatus({ savedAt, state }: { savedAt: string | null; state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "saving") return <span className="flex items-center gap-1 text-xs text-muted-foreground"><LoaderCircle className="size-3 animate-spin" />Đang lưu…</span>;
  if (state === "error") return <span className="text-xs font-bold text-destructive">Mất kết nối · chưa lưu</span>;
  if (state === "saved") return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3" />Đã lưu{savedAt ? ` · ${new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(savedAt))}` : ""}</span>;
  return <span className="text-xs text-muted-foreground">Autosave sau 0,7s</span>;
}
