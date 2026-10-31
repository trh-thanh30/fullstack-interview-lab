"use client";

import { AlertTriangle, BookOpenCheck, Check, LoaderCircle, RefreshCw, Sparkles, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { EssayRubricSnapshot } from "@/essay/essay-store";

import {
  retryEssayEvaluationAction,
  saveEssayDraftAction,
  submitEssayAction,
  type EssayActionState,
} from "../../actions";

type Evaluation = {
  id: string;
  model: string;
  promptVersion: string;
  score: number;
  dimensions: Record<string, number>;
  dimensionFeedback: Record<string, string>;
  strengths: string[];
  missingPoints: string[];
  incorrectClaims: string[];
  uncertainty: string | null;
  suggestedAnswer: string | null;
  followUpQuestion: string | null;
  sourceChunkIds: string[];
  createdAt: string;
};

type EssaySessionDto = {
  id: string;
  sessionQuestionId: string;
  prompt: string;
  topicName: string;
  draft: string;
  draftSavedAt: string | null;
  rubric: EssayRubricSnapshot;
  sources: Array<{ id: string; sourceTitle: string; heading: string | null; pageNumber: number | null }>;
  attempts: Array<{
    id: string;
    attemptNumber: number;
    answerText: string | null;
    submittedAt: string;
    evaluations: Evaluation[];
  }>;
};

const initialState: EssayActionState = { message: "", status: "idle" };

export function EssayWorkspace({ session }: { session: EssaySessionDto }) {
  const router = useRouter();
  const [answerText, setAnswerText] = useState(session.draft);
  const lastSavedText = useRef(session.draft);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(session.draftSavedAt ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState(session.draftSavedAt);
  const [isSaving, startSaving] = useTransition();
  const submit = submitEssayAction.bind(null, session.id);
  const [submitState, submitAction, evaluating] = useActionState(submit, initialState);

  useEffect(() => {
    if (answerText === lastSavedText.current) return;
    const timer = window.setTimeout(() => {
      startSaving(async () => {
        try {
          const result = await saveEssayDraftAction(session.id, answerText);
          setSaveState(result.saved ? "saved" : "error");
          if (result.savedAt) {
            lastSavedText.current = answerText;
            setSavedAt(result.savedAt);
          }
        } catch {
          setSaveState("error");
        }
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [answerText, session.id]);

  useEffect(() => {
    if (submitState.status === "evaluated") router.refresh();
  }, [router, submitState.status]);

  const compared = useMemo(() => session.attempts.slice(0, 2), [session.attempts]);

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(22rem,.82fr)]">
      <section className="space-y-6">
        <Card className="overflow-hidden rounded-[2rem]">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-extrabold tracking-wide text-accent-ink uppercase">{session.topicName}</span><span className="text-xs font-bold text-muted-foreground">Rubric v{session.rubric.version}</span></div>
            <CardTitle className="mt-3 text-2xl leading-8 break-words sm:text-3xl">{session.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form action={submitAction}>
              <div className="mb-2 flex items-center justify-between gap-3"><label className="text-xs font-extrabold tracking-widest uppercase" htmlFor="essay-answer">Câu trả lời của bạn</label><SaveStatus isSaving={isSaving} savedAt={savedAt} state={saveState} /></div>
              <Textarea className="min-h-80 resize-y rounded-2xl bg-background p-4 text-base leading-7" disabled={evaluating} id="essay-answer" maxLength={30_000} name="answerText" onChange={(event) => { setAnswerText(event.target.value); setSaveState("saving"); }} placeholder="Giải thích concept, trade-off và ví dụ thực tế…" value={answerText} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs tabular-nums text-muted-foreground">{answerText.length.toLocaleString("vi-VN")} / 30.000</span><Button className="min-w-48 rounded-xl" disabled={evaluating || answerText.trim().length < 20} size="lg" type="submit">{evaluating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{evaluating ? "Đang đánh giá…" : session.attempts.length ? "Submit attempt mới" : "Submit để đánh giá"}</Button></div>
              {evaluating ? <EvaluatingStatus /> : null}
              {submitState.message ? <p aria-live="polite" className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${submitState.status === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-accent-strong/30 bg-accent-soft text-accent-ink"}`}>{submitState.message}</p> : null}
            </form>
          </CardContent>
        </Card>

        {compared.length === 2 ? <AttemptComparison attempts={compared} /> : null}
      </section>

      <aside className="space-y-5">
        {session.attempts.length ? session.attempts.map((attempt) => <AttemptFeedback attempt={attempt} key={attempt.id} sessionId={session.id} />) : <Card className="rounded-3xl border-dashed"><CardContent className="p-8 text-center"><Target className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-bold">Feedback sẽ xuất hiện ở đây.</p><p className="mt-1 text-sm leading-6 text-muted-foreground">AI chấm theo bốn dimension và chỉ dùng rubric cùng source context được cung cấp.</p></CardContent></Card>}

        <Card className="rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BookOpenCheck className="size-4 text-accent-ink" />Reference đã kiểm duyệt</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{session.rubric.referenceAnswer || "Chưa có reference answer."}</p><div className="mt-5 border-t pt-4"><p className="text-xs font-extrabold tracking-widest uppercase">Source snapshot</p><ul className="mt-2 space-y-2">{session.sources.map((source) => <li className="text-xs text-muted-foreground" key={source.id}>{source.sourceTitle}{source.heading ? ` — ${source.heading}` : ""}{source.pageNumber ? ` · p.${source.pageNumber}` : ""}</li>)}</ul></div></CardContent></Card>
      </aside>
    </div>
  );
}

function AttemptFeedback({ attempt, sessionId }: { attempt: EssaySessionDto["attempts"][number]; sessionId: string }) {
  const latest = attempt.evaluations[0];
  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="border-b"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold tracking-widest text-accent-ink uppercase">Attempt {attempt.attemptNumber}</p><CardTitle className="mt-1 text-xl">{latest ? "AI feedback" : "Chưa đánh giá"}</CardTitle></div>{latest ? <Score value={latest.score} /> : null}</div></CardHeader>
      <CardContent className="space-y-5 p-5">
        {latest ? <>
          <div className="grid grid-cols-2 gap-2">{Object.entries(latest.dimensions).map(([key, score]) => <div className="rounded-xl border p-3" key={key}><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-extrabold tracking-wide uppercase">{key}</span><span className="text-sm font-black tabular-nums">{score}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{latest.dimensionFeedback[key]}</p></div>)}</div>
          <FeedbackList icon={<Check className="size-4 text-emerald-600" />} items={latest.strengths} title="Điểm làm tốt" />
          <FeedbackList icon={<Target className="size-4 text-amber-600" />} items={latest.missingPoints} title="Còn thiếu" />
          {latest.incorrectClaims.length ? <FeedbackList icon={<AlertTriangle className="size-4 text-destructive" />} items={latest.incorrectClaims} title="Claim chưa chính xác" /> : null}
          {latest.uncertainty ? <p className="rounded-xl border border-dashed p-3 text-xs leading-5 text-muted-foreground"><strong>Uncertainty:</strong> {latest.uncertainty}</p> : null}
          <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs font-extrabold tracking-wide uppercase">Câu trả lời gợi ý từ AI</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{latest.suggestedAnswer}</p></div>
          <div className="rounded-xl border-l-4 border-accent-strong bg-accent-soft/50 p-4"><p className="text-xs font-extrabold tracking-wide uppercase">Follow-up</p><p className="mt-1 text-sm font-semibold">{latest.followUpQuestion}</p></div>
          <p className="text-[11px] text-muted-foreground">{latest.model} · {latest.promptVersion} · {latest.sourceChunkIds.length} source chunks · {attempt.evaluations.length} evaluation(s)</p>
        </> : <p className="text-sm text-muted-foreground">Attempt đã được lưu. Bạn có thể retry evaluation mà không cần nhập lại.</p>}
        <RetryEvaluationForm answerId={attempt.id} sessionId={sessionId} />
      </CardContent>
    </Card>
  );
}

function RetryEvaluationForm({ answerId, sessionId }: { answerId: string; sessionId: string }) {
  const action = retryEssayEvaluationAction.bind(null, sessionId, answerId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  useEffect(() => { if (state.status === "evaluated") router.refresh(); }, [router, state.status]);
  return <form action={formAction}><Button className="w-full rounded-xl" disabled={pending} type="submit" variant="outline">{pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}{pending ? "Đang đánh giá lại…" : "Đánh giá lại attempt này"}</Button>{state.message ? <p className={`mt-2 text-xs font-semibold ${state.status === "error" ? "text-destructive" : "text-accent-ink"}`}>{state.message}</p> : null}</form>;
}

function AttemptComparison({ attempts }: { attempts: EssaySessionDto["attempts"] }) {
  return <Card className="rounded-3xl"><CardHeader><CardTitle className="text-2xl">So sánh hai lần gần nhất</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{attempts.map((attempt) => <article className="rounded-2xl border p-4" key={attempt.id}><div className="flex items-center justify-between"><span className="text-xs font-extrabold tracking-wide uppercase">Attempt {attempt.attemptNumber}</span><span className="font-heading text-3xl">{attempt.evaluations[0]?.score ?? "—"}</span></div><p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{attempt.answerText}</p></article>)}</CardContent></Card>;
}

function FeedbackList({ icon, items, title }: { icon: React.ReactNode; items: string[]; title: string }) {
  return <div><p className="flex items-center gap-2 text-xs font-extrabold tracking-wide uppercase">{icon}{title}</p><ul className="mt-2 space-y-1.5">{items.map((item, index) => <li className="text-sm leading-6 text-muted-foreground" key={`${item}-${index}`}>• {item}</li>)}</ul></div>;
}

function Score({ value }: { value: number }) {
  return <div className="grid size-16 place-items-center rounded-full border-4 border-accent-strong bg-accent-soft"><span className="font-heading text-2xl tabular-nums">{Math.round(value)}</span></div>;
}

function SaveStatus({ isSaving, savedAt, state }: { isSaving: boolean; savedAt: string | null; state: "idle" | "saving" | "saved" | "error" }) {
  if (isSaving || state === "saving") return <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><LoaderCircle className="size-3 animate-spin" />Đang lưu…</span>;
  if (state === "error") return <span className="text-xs font-semibold text-destructive">Autosave lỗi</span>;
  if (state === "saved") return <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Check className="size-3" />Đã lưu{savedAt ? ` · ${new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(savedAt))}` : ""}</span>;
  return <span className="text-xs text-muted-foreground">Draft tự lưu sau 0,7s</span>;
}

function EvaluatingStatus() {
  return <div aria-live="polite" className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border bg-muted/25 p-3 text-center text-[10px] font-extrabold tracking-wide uppercase"><span className="animate-pulse text-accent-ink">Retrieving context</span><span className="animate-pulse [animation-delay:250ms]">Applying rubric</span><span className="animate-pulse [animation-delay:500ms]">Validating score</span></div>;
}

