'use client';

import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { Check, Cpu, LoaderCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

import { reviewCodingAction, saveCodingDraftAction, type CodingActionState } from '../../actions';

type CodingDto = {
  id: string;
  question: { prompt: string; explanation: string | null; topicName: string; rubric: unknown };
  draft: { language: string; code: string; explanation: string; savedAt: string };
  reviews: Array<{
    id: string;
    language: string;
    executionStatus: string;
    score: number;
    complexity: string;
    correctnessAssumptions: string[];
    edgeCases: string[];
    strengths: string[];
    risks: string[];
    suggestions: string[];
    summary: string;
    createdAt: string;
  }>;
};
const initial: CodingActionState = { status: 'idle', message: '' };

export function CodingWorkspace({ session }: { session: CodingDto }) {
  const [language, setLanguage] = useState<'typescript' | 'javascript'>(
    session.draft.language === 'javascript' ? 'javascript' : 'typescript'
  );
  const [code, setCode] = useState(session.draft.code);
  const [explanation, setExplanation] = useState(session.draft.explanation);
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saved');
  const [savedAt, setSavedAt] = useState(session.draft.savedAt);
  const lastSaved = useRef(JSON.stringify({ language, code, explanation }));
  const [, startSaving] = useTransition();
  const router = useRouter();
  const [reviewState, reviewAction, reviewing] = useActionState(
    reviewCodingAction.bind(null, session.id),
    initial
  );
  const extensions = useMemo(
    () => [javascript({ typescript: language === 'typescript', jsx: false })],
    [language]
  );
  useEffect(() => {
    const snapshot = JSON.stringify({ language, code, explanation });
    if (snapshot === lastSaved.current) return;
    const timer = window.setTimeout(
      () =>
        startSaving(async () => {
          try {
            const result = await saveCodingDraftAction(session.id, { language, code, explanation });
            if (!result.saved) throw new Error();
            lastSaved.current = snapshot;
            setSavedAt(result.savedAt ?? savedAt);
            setSaveState('saved');
          } catch {
            setSaveState('error');
          }
        }),
      700
    );
    return () => window.clearTimeout(timer);
  }, [code, explanation, language, savedAt, session.id]);
  useEffect(() => {
    if (reviewState.status === 'success') router.refresh();
  }, [reviewState.status, router]);
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <section className="space-y-5">
        <Card className="rounded-[2rem]">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-black text-accent-ink uppercase">
                {session.question.topicName}
              </span>
              <SaveStatus savedAt={savedAt} state={saveState} />
            </div>
            <CardTitle className="mt-3 text-2xl leading-8">{session.question.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form action={reviewAction}>
              <div className="flex items-center justify-between border-b bg-[#111416] px-4 py-3 text-[#e8eee9]">
                <select
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold"
                  name="language"
                  onChange={(event) => {
                    setLanguage(event.target.value as typeof language);
                    setSaveState('saving');
                  }}
                  value={language}
                >
                  <option className="text-foreground" value="typescript">
                    TypeScript
                  </option>
                  <option className="text-foreground" value="javascript">
                    JavaScript
                  </option>
                </select>
                <span className="flex items-center gap-2 text-[10px] font-black tracking-widest text-white/45 uppercase">
                  <Cpu className="size-3" />
                  Static analysis only
                </span>
              </div>
              <input name="code" type="hidden" value={code} />
              <CodeMirror
                basicSetup={{
                  autocompletion: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                  lineNumbers: true,
                }}
                extensions={extensions}
                height="34rem"
                onChange={(value) => {
                  setCode(value);
                  setSaveState('saving');
                }}
                theme="dark"
                value={code}
              />
              <div className="border-t p-5">
                <label
                  className="text-xs font-black tracking-widest uppercase"
                  htmlFor="code-explanation"
                >
                  Explanation & assumptions
                </label>
                <Textarea
                  className="mt-2 min-h-36"
                  id="code-explanation"
                  name="explanation"
                  onChange={(event) => {
                    setExplanation(event.target.value);
                    setSaveState('saving');
                  }}
                  placeholder="Giải thích approach, complexity, invariant và assumption…"
                  value={explanation}
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-xs font-bold text-amber-700">
                    <ShieldAlert className="size-4" />
                    Code sẽ không được chạy.
                  </p>
                  <Button
                    className="min-w-44 rounded-xl"
                    disabled={reviewing || code.trim().length < 20}
                    size="lg"
                    type="submit"
                  >
                    {reviewing ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                    {reviewing ? 'Đang review…' : 'Static AI review'}
                  </Button>
                </div>
                {reviewState.message ? (
                  <p
                    className={`mt-3 rounded-xl border p-3 text-sm font-bold ${reviewState.status === 'error' ? 'text-destructive' : 'text-accent-ink'}`}
                  >
                    {reviewState.message}
                  </p>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
      <aside className="space-y-5">
        {session.reviews.length ? (
          session.reviews.map((review, index) => (
            <ReviewCard index={session.reviews.length - index} key={review.id} review={review} />
          ))
        ) : (
          <Card className="rounded-3xl border-dashed">
            <CardContent className="p-8 text-center">
              <Sparkles className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-bold">Feedback sẽ xuất hiện ở đây.</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Review phân tích complexity, assumptions và edge cases từ source text.
              </p>
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
function SaveStatus({ savedAt, state }: { savedAt: string; state: 'saving' | 'saved' | 'error' }) {
  if (state === 'saving')
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <LoaderCircle className="size-3 animate-spin" />
        Đang lưu…
      </span>
    );
  if (state === 'error')
    return <span className="text-xs font-bold text-destructive">Autosave lỗi</span>;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Check className="size-3" />
      Đã lưu ·{' '}
      {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(savedAt)
      )}
    </span>
  );
}
function ReviewCard({ index, review }: { index: number; review: CodingDto['reviews'][number] }) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black tracking-widest text-accent-ink uppercase">
              Static review {index}
            </p>
            <CardTitle className="mt-1 text-xl">{review.language}</CardTitle>
          </div>
          <span className="font-heading text-5xl">{Math.round(review.score)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-xs font-bold text-amber-900">
          Execution status: {review.executionStatus}. Code chưa được chạy.
        </p>
        <p className="text-sm leading-6 text-muted-foreground">{review.summary}</p>
        <div>
          <p className="text-xs font-black uppercase">Complexity</p>
          <p className="mt-1 text-sm text-muted-foreground">{review.complexity}</p>
        </div>
        <ReviewList title="Correctness assumptions" values={review.correctnessAssumptions} />
        <ReviewList title="Edge cases" values={review.edgeCases} />
        <ReviewList title="Risks" values={review.risks} />
        <ReviewList title="Suggestions" values={review.suggestions} />
      </CardContent>
    </Card>
  );
}
function ReviewList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-black uppercase">{title}</p>
      <ul className="mt-1 space-y-1 text-xs leading-5 text-muted-foreground">
        {values.map((value) => (
          <li key={value}>• {value}</li>
        ))}
      </ul>
    </div>
  );
}
