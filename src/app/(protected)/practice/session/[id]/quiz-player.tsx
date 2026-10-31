"use client";

import { Check, Clock3, CornerDownRight, LoaderCircle, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PracticeStore } from "@/practice/practice-store";

import {
  advancePracticeAction,
  submitMcqAnswerAction,
  type PracticeActionState,
} from "../../actions";

const initialPracticeActionState: PracticeActionState = { message: "" };

type SessionDTO = Extract<
  NonNullable<Awaited<ReturnType<PracticeStore["getSessionForPlay"]>>>,
  { state: "asking" }
>;

export function QuizPlayer({ session }: { session: SessionDTO }) {
  const [selectedChoiceId, setSelectedChoiceId] = useState(session.answer?.selectedChoiceIds[0] ?? "");
  const [elapsedSeconds, setElapsedSeconds] = useState(() => elapsed(session.startedAt));
  const submitFormRef = useRef<HTMLFormElement>(null);
  const nextFormRef = useRef<HTMLFormElement>(null);
  const submitAction = submitMcqAnswerAction.bind(null, session.id, session.question.id);
  const nextAction = advancePracticeAction.bind(null, session.id, session.question.id);
  const [state, action, pending] = useActionState(submitAction, initialPracticeActionState);
  const answered = Boolean(session.answer);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsedSeconds(elapsed(session.startedAt)), 1_000);
    return () => window.clearInterval(timer);
  }, [session.startedAt]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      const key = event.key.toLowerCase();
      const letterIndex = key.length === 1 ? key.charCodeAt(0) - 97 : -1;
      const numberIndex = Number.parseInt(key, 10) - 1;
      const index = numberIndex >= 0 ? numberIndex : letterIndex;
      if (!answered && index >= 0 && index < session.question.choices.length) {
        event.preventDefault();
        setSelectedChoiceId(session.question.choices[index]!.id);
      }
      if ((event.key === "Enter" || key === "n") && answered) {
        event.preventDefault();
        nextFormRef.current?.requestSubmit();
      } else if (event.key === "Enter" && !answered && selectedChoiceId && !pending) {
        event.preventDefault();
        submitFormRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answered, pending, selectedChoiceId, session.question.choices]);

  const progress = Math.round(((session.currentPosition + (answered ? 1 : 0)) / session.total) * 100);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
        <div className="flex items-center gap-3"><Badge variant="outline">{session.question.topicName}</Badge><span className="text-xs font-extrabold tracking-widest text-muted-foreground uppercase">Question {session.currentPosition + 1} / {session.total}</span></div>
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-bold"><Clock3 className="size-3.5 text-accent-ink" />{formatDuration(elapsedSeconds)}</div>
      </div>
      <div aria-label={`${progress}% hoàn thành`} className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}><div className="h-full bg-accent-strong transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>

      <Card className="mt-8 rounded-[2rem] shadow-[0_25px_80px_oklch(0.2_0.03_250/.08)]">
        <CardHeader className="border-b px-5 py-7 sm:px-8 sm:py-9">
          <p className="text-xs font-extrabold tracking-[.16em] text-accent-ink uppercase">Commit one answer</p>
          <h1 className="mt-3 break-words font-heading text-3xl leading-tight sm:text-5xl">{session.question.prompt}</h1>
        </CardHeader>
        <CardContent className="px-5 sm:px-8">
          <form action={action} className="space-y-3" ref={submitFormRef}>
            {session.question.choices.map((choice, index) => {
              const selected = selectedChoiceId === choice.id;
              const correct = session.answer?.correctChoiceIds.includes(choice.id);
              const wrongSelected = answered && selected && !correct;
              return (
                <label className={cn(
                  "group flex min-h-16 items-center gap-4 rounded-2xl border bg-background p-4 transition",
                  !answered && "cursor-pointer hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-sm",
                  selected && !answered && "border-foreground bg-foreground text-background ring-2 ring-foreground/10",
                  correct && "border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/35 dark:text-emerald-100",
                  wrongSelected && "border-destructive bg-destructive/10 text-destructive",
                )} key={choice.id}>
                  <input checked={selected} className="sr-only" disabled={answered} name="selectedChoiceId" onChange={() => setSelectedChoiceId(choice.id)} type="radio" value={choice.id} />
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg border font-heading text-lg", selected && !answered && "border-background/30", correct && "border-emerald-600", wrongSelected && "border-destructive")}>{String.fromCharCode(65 + index)}</span>
                  <span className="min-w-0 flex-1 break-words font-semibold leading-6">{choice.content}</span>
                  {correct ? <Check className="size-5" /> : wrongSelected ? <X className="size-5" /> : <kbd className="rounded border border-current/15 px-1.5 py-0.5 text-[10px] opacity-45">{index + 1}</kbd>}
                </label>
              );
            })}

            {!answered ? (
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Button className="h-11 rounded-xl px-5" disabled={!selectedChoiceId || pending} size="lg" type="submit">{pending ? <LoaderCircle className="animate-spin" /> : <CornerDownRight />}{pending ? "Đang chấm…" : "Submit answer"}</Button>
                <span className="text-xs text-muted-foreground">Phím 1–{session.question.choices.length} để chọn · Enter để submit</span>
              </div>
            ) : null}
            {state.message && !answered ? <p aria-live="polite" className="text-sm font-semibold text-destructive">{state.message}</p> : null}
          </form>

          {session.answer ? (
            <div className={cn("mt-6 rounded-2xl border p-5", session.answer.isCorrect ? "border-emerald-600/35 bg-emerald-50 dark:bg-emerald-950/25" : "border-amber-500/40 bg-amber-50 dark:bg-amber-950/25")}>
              <p className="font-heading text-2xl">{session.answer.isCorrect ? "Chính xác." : "Chưa đúng — xem lại cơ chế bên dưới."}</p>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{session.answer.explanation || "Câu hỏi này chưa có explanation."}</p>
              {session.answer.sources.length ? <p className="mt-3 text-xs font-bold text-muted-foreground">Nguồn: {session.answer.sources.map((source) => `${source.sourceTitle}${source.pageNumber ? ` · trang ${source.pageNumber}` : ""}`).join("; ")}</p> : null}
              <form action={nextAction} className="mt-5" ref={nextFormRef}><Button className="h-11 rounded-xl" size="lg" type="submit">{session.currentPosition === session.total - 1 ? "Xem kết quả" : "Câu tiếp theo"}<CornerDownRight /></Button><span className="ml-3 text-xs text-muted-foreground">Enter hoặc N</span></form>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function elapsed(startedAt: Date | null) {
  return startedAt ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1_000)) : 0;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
