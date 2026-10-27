"use client";

import {
  ArchiveX,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  GitMerge,
  Keyboard,
  LoaderCircle,
  Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionStore } from "@/questions/question-store";

import {
  reviewQuestionAction,
  type ReviewQuestionState,
} from "../actions";

type QueueQuestion = Awaited<ReturnType<QuestionStore["listReviewQueue"]>>[number];
const initialState: ReviewQuestionState = { message: "" };

export function ReviewQueue({ questions }: { questions: QueueQuestion[] }) {
  const [position, setPosition] = useState(0);
  const safePosition = Math.min(position, Math.max(questions.length - 1, 0));
  const question = questions[safePosition];

  if (!question) {
    return (
      <Card className="mt-8 rounded-[2rem] border-dashed py-20">
        <CardContent className="text-center">
          <CheckCircle2 className="mx-auto size-11 text-accent-ink" />
          <h2 className="mt-5 font-heading text-3xl">Queue đã sạch.</h2>
          <p className="mt-2 text-muted-foreground">Không còn draft nào đang chờ review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-paper">
        <div className="flex items-center gap-3">
          <span className="font-heading text-2xl">{String(safePosition + 1).padStart(2, "0")}</span>
          <span className="text-xs font-bold tracking-widest text-paper/50 uppercase">/ {String(questions.length).padStart(2, "0")} waiting</span>
        </div>
        <div className="flex items-center gap-2">
          <Button aria-label="Câu trước" disabled={safePosition === 0} onClick={() => setPosition((value) => Math.max(value - 1, 0))} size="icon-sm" type="button" variant="secondary"><ArrowLeft /></Button>
          <Button aria-label="Câu tiếp theo" disabled={safePosition === questions.length - 1} onClick={() => setPosition((value) => Math.min(value + 1, questions.length - 1))} size="icon-sm" type="button" variant="secondary"><ArrowRight /></Button>
        </div>
      </div>
      <ReviewWorkspace
        key={question.id}
        onNext={() => setPosition((value) => Math.min(value + 1, questions.length - 1))}
        onPrevious={() => setPosition((value) => Math.max(value - 1, 0))}
        question={question}
      />
    </div>
  );
}

function ReviewWorkspace({
  question,
  onNext,
  onPrevious,
}: {
  question: QueueQuestion;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const [state, action, pending] = useActionState(reviewQuestionAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (pending || event.metaKey || event.altKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches("input, textarea, select, [contenteditable=true]");
      if (isTyping) return;

      const key = event.key.toLowerCase();
      if (key === "j") onNext();
      if (key === "k") onPrevious();
      if (key === "e") router.push(`/review/${question.id}/edit`);
      if (key === "r") formRef.current?.querySelector<HTMLTextAreaElement>("[name=reason]")?.focus();
      if (["a", "o", "m"].includes(key)) {
        const value = key === "a" ? "approve" : key === "o" ? "mark_outdated" : "merge";
        const button = formRef.current?.querySelector<HTMLButtonElement>(`button[value=${value}]`);
        if (button && !button.disabled) formRef.current?.requestSubmit(button);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNext, onPrevious, pending, question.id, router]);

  return (
    <form action={action} className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,.8fr)_19rem]" ref={formRef}>
      <input name="questionId" type="hidden" value={question.id} />

      <section className="min-w-0 space-y-4">
        <Card className="rounded-[2rem] border-l-4 border-l-accent-strong">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{question.generationModel ? "AI draft" : "Manual draft"}</Badge>
              <Badge variant="outline">{label(question.type)}</Badge>
              <Badge variant="outline">{label(question.level)}</Badge>
              <span className="ml-auto text-xs font-bold text-muted-foreground">v{question.version} · {question.topicName}</span>
            </div>
            <CardTitle className="mt-4 text-2xl leading-8">{question.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ReviewSection title="Answer">
              {question.type === "mcq" ? (
                <ol className="space-y-2">
                  {question.choices.map((choice, index) => (
                    <li className={`flex gap-3 rounded-xl border p-3 ${choice.isCorrect ? "border-accent-strong bg-accent-soft/55" : ""}`} key={choice.id}>
                      <span className="font-heading text-lg">{String.fromCharCode(65 + index)}.</span>
                      <span className="flex-1">{choice.content}</span>
                      {choice.isCorrect ? <Check className="size-4 text-accent-ink" /> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="whitespace-pre-wrap leading-7">{question.rubric?.referenceAnswer || "Chưa có reference answer."}</p>
              )}
            </ReviewSection>

            {question.explanation ? <ReviewSection title="Explanation"><p className="whitespace-pre-wrap leading-7 text-muted-foreground">{question.explanation}</p></ReviewSection> : null}

            {question.rubric ? (
              <ReviewSection title="Rubric">
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.rubric.dimensions.map((dimension) => (
                    <div className="rounded-xl border p-3" key={dimension.key}>
                      <div className="flex justify-between gap-3 font-bold"><span>{dimension.label}</span><span>{dimension.weight}%</span></div>
                      <p className="mt-1 text-sm text-muted-foreground">{dimension.description}</p>
                    </div>
                  ))}
                </div>
              </ReviewSection>
            ) : null}
          </CardContent>
        </Card>

        {question.similarQuestions.length ? (
          <Card className="rounded-2xl bg-amber-50 text-amber-950 ring-amber-300 dark:bg-amber-950/30 dark:text-amber-100">
            <CardHeader><CardTitle className="flex items-center gap-2"><CircleAlert className="size-5" />Có thể trùng nội dung</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {question.similarQuestions.map((candidate) => (
                <div className="flex gap-3 border-t border-amber-900/15 pt-3 first:border-0 first:pt-0" key={candidate.id}>
                  <Badge variant="outline">{Math.round(candidate.similarity * 100)}%</Badge>
                  <p className="line-clamp-2 flex-1 text-sm font-semibold">{candidate.prompt}</p>
                  <a aria-label="Mở câu tương tự" href={`/review/${candidate.id}/edit`} target="_blank"><ExternalLink className="size-4" /></a>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </section>

      <aside className="min-w-0 space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-heading text-2xl">Source evidence</h2><Badge variant="secondary">{question.sources.length}</Badge></div>
        {question.sources.length ? question.sources.map((source) => (
          <Card className="rounded-2xl" key={source.id}>
            <CardHeader className="border-b">
              <CardTitle>{source.heading ?? source.sourceTitle}</CardTitle>
              <p className="text-xs text-muted-foreground">{source.sourceTitle}{source.pageNumber ? ` · trang ${source.pageNumber}` : ""}{source.isPrimary ? " · primary" : ""}</p>
            </CardHeader>
            <CardContent><p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{source.excerpt}</p></CardContent>
          </Card>
        )) : <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Manual question không có source.</div>}
      </aside>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <Card className="rounded-[2rem] bg-ink text-paper">
          <CardHeader className="border-b border-paper/10"><CardTitle className="text-2xl">Decision</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button className="h-11 w-full bg-accent-strong text-ink hover:bg-accent-strong/85" disabled={pending} name="reviewAction" type="submit" value="approve"><CheckCircle2 />Approve & publish <Key>A</Key></Button>
            <Button className="h-10 w-full border-paper/20 bg-transparent text-paper hover:bg-paper/10 hover:text-paper" disabled={pending} onClick={() => router.push(`/review/${question.id}/edit`)} type="button" variant="outline"><Pencil />Edit <Key>E</Key></Button>

            <div className="border-t border-paper/10 pt-4">
              <label className="text-xs font-bold tracking-wide text-paper/55 uppercase" htmlFor="reject-reason">Reject reason</label>
              <Textarea className="mt-2 min-h-20 border-paper/20 bg-paper/5 text-paper placeholder:text-paper/35" id="reject-reason" maxLength={500} name="reason" onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  const button = formRef.current?.querySelector<HTMLButtonElement>("button[value=reject]");
                  if (button) formRef.current?.requestSubmit(button);
                }
              }} placeholder="Lý do ngắn, tối thiểu 5 ký tự…" />
              <Button className="mt-2 w-full" disabled={pending} name="reviewAction" type="submit" value="reject" variant="destructive"><ArchiveX />Reject</Button>
              <p className="mt-1 text-[11px] text-paper/40">R focus · Ctrl/⌘ + Enter submit</p>
            </div>

            <Button className="w-full border-paper/20 bg-transparent text-paper hover:bg-paper/10 hover:text-paper" disabled={pending} name="reviewAction" type="submit" value="mark_outdated" variant="outline"><Clock3 />Mark outdated <Key>O</Key></Button>

            <div className="border-t border-paper/10 pt-4">
              <label className="text-xs font-bold tracking-wide text-paper/55 uppercase" htmlFor="merge-target">Merge into</label>
              <select className="mt-2 h-10 w-full rounded-lg border border-paper/20 bg-ink px-2 text-sm" disabled={!question.similarQuestions.length || pending} id="merge-target" name="mergedIntoQuestionId">
                {question.similarQuestions.length ? question.similarQuestions.map((candidate) => <option key={candidate.id} value={candidate.id}>{Math.round(candidate.similarity * 100)}% · {candidate.prompt.slice(0, 45)}</option>) : <option value="">Không có candidate</option>}
              </select>
              <Button className="mt-2 w-full border-paper/20 bg-transparent text-paper hover:bg-paper/10 hover:text-paper" disabled={!question.similarQuestions.length || pending} name="reviewAction" type="submit" value="merge" variant="outline"><GitMerge />Merge & archive <Key>M</Key></Button>
            </div>

            {pending ? <p className="flex items-center gap-2 text-sm text-paper/60"><LoaderCircle className="size-4 animate-spin" />Đang lưu quyết định…</p> : null}
            {state.message ? <p aria-live="polite" className={`text-sm font-semibold ${state.success ? "text-accent-strong" : "text-red-300"}`}>{state.message}</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><Keyboard className="size-4" />Keyboard flow</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs text-muted-foreground"><span><Key>J</Key> next</span><span><Key>K</Key> previous</span><span><Key>A</Key> approve</span><span><Key>E</Key> edit</span><span><Key>R</Key> reject note</span><span><Key>O</Key> outdated</span></CardContent>
        </Card>

        {question.latestReview ? (
          <p className="px-2 text-xs leading-5 text-muted-foreground">Review gần nhất: <strong>{label(question.latestReview.action)}</strong> bởi {question.latestReview.reviewerName ?? question.latestReview.reviewerEmail}, {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(question.latestReview.createdAt)}.</p>
        ) : null}
      </aside>
    </form>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-2 text-xs font-extrabold tracking-[.16em] text-accent-ink uppercase">{title}</h2>{children}</section>;
}

function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="ml-auto rounded border border-current/20 px-1.5 py-0.5 text-[10px] opacity-60">{children}</kbd>;
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
