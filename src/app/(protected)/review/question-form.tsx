"use client";

import { Archive, BookOpen, CheckCircle2, Eye, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  initialQuestionFormState,
  type QuestionFormState,
} from "@/questions/question-form";

type EditorOptions = {
  topics: Array<{ id: string; name: string }>;
  technologies: Array<{ id: string; name: string; primaryTopicId: string }>;
  sources: Array<{
    id: string;
    heading: string | null;
    pageNumber: number | null;
    sourceTitle: string;
  }>;
};

export type QuestionFormValues = {
  topicId: string;
  technologyIds: string[];
  sourceChunkIds: string[];
  type: string;
  level: string;
  status: string;
  prompt: string;
  explanation: string;
  isManual: boolean;
  choices: Array<{ content: string; isCorrect: boolean }>;
  rubric: {
    dimensions: Array<{ key: string; description: string }>;
    referenceAnswer: string | null;
  } | null;
};

export function QuestionForm({
  action,
  archiveAction,
  options,
  initialValues,
  mode,
}: {
  action: (state: QuestionFormState, data: FormData) => Promise<QuestionFormState>;
  archiveAction?: () => Promise<void>;
  options: EditorOptions;
  initialValues?: QuestionFormValues;
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, initialQuestionFormState);
  const [type, setType] = useState(initialValues?.type ?? "mcq");
  const [prompt, setPrompt] = useState(initialValues?.prompt ?? "");
  const [explanation, setExplanation] = useState(initialValues?.explanation ?? "");
  const [choices, setChoices] = useState(
    Array.from({ length: 6 }, (_, index) => initialValues?.choices[index]?.content ?? ""),
  );
  const [correctChoice, setCorrectChoice] = useState(
    initialValues?.choices.findIndex((choice) => choice.isCorrect) ?? -1,
  );
  const selectedTopic = initialValues?.topicId ?? options.topics[0]?.id ?? "";
  const sourcePreview = useMemo(
    () => options.sources.find((source) => initialValues?.sourceChunkIds.includes(source.id)),
    [initialValues?.sourceChunkIds, options.sources],
  );
  const isMcq = type === "mcq";

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold tracking-[.18em] text-accent-ink uppercase">
                  Nội dung câu hỏi
                </p>
                <CardTitle className="mt-1 text-2xl">Viết như đang hỏi một ứng viên thật</CardTitle>
              </div>
              <Badge variant="outline">{mode === "create" ? "New draft" : "Editing"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Field label="Category" error={state.fieldErrors?.topicId?.[0]}>
                <select className={selectClassName} defaultValue={selectedTopic} name="topicId">
                  {options.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                </select>
              </Field>
              <Field label="Type" error={state.fieldErrors?.type?.[0]}>
                <select className={selectClassName} name="type" onChange={(event) => setType(event.target.value)} value={type}>
                  <option value="mcq">Multiple choice</option>
                  <option value="short_answer">Short answer</option>
                  <option value="deep_dive">Deep dive</option>
                  <option value="system_design">System design</option>
                </select>
              </Field>
              <Field label="Level" error={state.fieldErrors?.level?.[0]}>
                <select className={selectClassName} defaultValue={initialValues?.level ?? "middle"} name="level">
                  <option value="junior">Junior</option><option value="middle">Middle</option><option value="senior">Senior</option>
                </select>
              </Field>
              <Field label="Status" error={state.fieldErrors?.status?.[0]}>
                <select className={selectClassName} defaultValue={initialValues?.status ?? "draft"} name="status">
                  <option value="draft">Draft</option><option value="reviewed">Reviewed</option><option value="published">Published</option><option value="outdated">Outdated</option><option value="archived">Archived</option>
                </select>
              </Field>
            </div>

            <Field label="Question prompt" error={state.fieldErrors?.prompt?.[0]}>
              <Textarea className="min-h-36 resize-y text-base leading-7" name="prompt" onChange={(event) => setPrompt(event.target.value)} placeholder="Ví dụ: Event loop trong Node.js xử lý microtask và macrotask như thế nào?" required value={prompt} />
            </Field>

            <Field label="Explanation / reviewer notes" error={state.fieldErrors?.explanation?.[0]}>
              <Textarea className="min-h-28 resize-y" name="explanation" onChange={(event) => setExplanation(event.target.value)} placeholder="Giải thích đáp án, trade-off hoặc những tín hiệu cần tìm trong câu trả lời…" value={explanation} />
            </Field>
          </CardContent>
        </Card>

        {isMcq ? (
          <Card className="rounded-3xl">
            <CardHeader className="border-b"><CardTitle className="text-xl">Choices</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {choices.map((choice, index) => (
                <div className="grid grid-cols-[auto_1fr] items-center gap-3" key={index}>
                  <input aria-label={`Đặt lựa chọn ${index + 1} là đáp án đúng`} checked={correctChoice === index} className="size-4 accent-[var(--accent-ink)]" name="correctChoice" onChange={() => setCorrectChoice(index)} type="radio" value={index} />
                  <Input name={`choice-${index}`} onChange={(event) => setChoices((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Lựa chọn ${String.fromCharCode(65 + index)}`} value={choice} />
                </div>
              ))}
              {state.fieldErrors?.choices?.[0] ? <ErrorText>{state.fieldErrors.choices[0]}</ErrorText> : null}
              {state.fieldErrors?.correctChoice?.[0] ? <ErrorText>{state.fieldErrors.correctChoice[0]}</ErrorText> : null}
            </CardContent>
          </Card>
        ) : (
          <RubricFields rubric={initialValues?.rubric} errors={state.fieldErrors} />
        )}

        <Card className="rounded-3xl">
          <CardHeader className="border-b"><CardTitle className="text-xl">Taxonomy & provenance</CardTitle></CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <fieldset>
              <legend className="mb-3 text-sm font-bold">Technologies</legend>
              <div className="max-h-56 space-y-2 overflow-auto rounded-2xl border p-3">
                {options.technologies.map((technology) => (
                  <label className="flex items-center gap-2 text-sm" key={technology.id}>
                    <input defaultChecked={initialValues?.technologyIds.includes(technology.id)} name="technologyIds" type="checkbox" value={technology.id} />
                    {technology.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-bold">Sources</legend>
              <label className="mb-3 flex items-center gap-2 rounded-xl bg-accent-soft/60 p-3 text-sm font-bold">
                <input defaultChecked={initialValues?.isManual} name="isManual" type="checkbox" />
                Manual question — không phụ thuộc tài liệu nhập
              </label>
              <select className={cn(selectClassName, "h-40 py-2")} defaultValue={initialValues?.sourceChunkIds ?? []} multiple name="sourceChunkIds">
                {options.sources.map((source) => (
                  <option key={source.id} value={source.id}>{source.sourceTitle} · {source.heading ?? `Trang ${source.pageNumber ?? "?"}`}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">Giữ Ctrl/Cmd để chọn nhiều source chunks.</p>
              {state.fieldErrors?.sourceChunkIds?.[0] ? <ErrorText>{state.fieldErrors.sourceChunkIds[0]}</ErrorText> : null}
            </fieldset>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
          <Button disabled={pending} size="lg" type="submit"><Save aria-hidden="true" />{pending ? "Đang lưu…" : "Lưu câu hỏi"}</Button>
          <Link className={buttonVariants({ variant: "outline", size: "lg" })} href="/review">Hủy</Link>
          {archiveAction ? <Button formAction={archiveAction} formNoValidate className="ml-auto" type="submit" variant="destructive"><Archive aria-hidden="true" />Archive</Button> : null}
          <p aria-live="polite" className="w-full text-sm font-semibold text-destructive">{state.message}</p>
        </div>
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <Card className="rounded-[2rem] bg-ink text-paper shadow-[0_24px_70px_oklch(0.2_0.03_250/.2)]">
          <CardHeader className="border-b border-paper/10">
            <div className="flex items-center justify-between"><Badge className="bg-accent-strong text-ink"><Eye aria-hidden="true" />Practice preview</Badge><Sparkles className="size-4 text-paper/50" /></div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] font-extrabold tracking-[.18em] text-paper/45 uppercase">Question</p>
            <h2 className="mt-3 font-heading text-3xl leading-tight">{prompt || "Câu hỏi của bạn sẽ xuất hiện tại đây."}</h2>
            {isMcq ? <div className="mt-7 space-y-2">{choices.filter(Boolean).map((choice, index) => <div className="flex gap-3 rounded-xl border border-paper/15 p-3 text-sm" key={index}><span className="font-extrabold text-accent-strong">{String.fromCharCode(65 + index)}</span><span>{choice}</span></div>)}</div> : <div className="mt-7 min-h-28 rounded-xl border border-dashed border-paper/20 p-4 text-sm text-paper/45">Ứng viên nhập câu trả lời tự luận tại đây…</div>}
            {explanation ? <div className="mt-7 border-t border-paper/10 pt-5"><p className="flex items-center gap-2 text-xs font-extrabold text-accent-strong"><CheckCircle2 className="size-4" />Explanation</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-paper/65">{explanation}</p></div> : null}
            <div className="mt-7 flex items-center gap-2 text-xs text-paper/45"><BookOpen className="size-4" />{sourcePreview?.sourceTitle ?? "Source hiển thị sau khi lưu"}</div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

function RubricFields({ rubric, errors }: { rubric?: QuestionFormValues["rubric"]; errors?: Record<string, string[]> }) {
  const descriptions = Object.fromEntries(rubric?.dimensions.map((dimension) => [dimension.key, dimension.description]) ?? []);
  return <Card className="rounded-3xl"><CardHeader className="border-b"><CardTitle className="text-xl">Rubric tự luận</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
    {[['rubricCorrectness','Correctness','correctness'],['rubricCompleteness','Completeness','completeness'],['rubricClarity','Clarity','clarity'],['rubricPractical','Practical experience','practical']].map(([name,label,key]) => <Field key={name} label={label}><Textarea defaultValue={descriptions[key] ?? ""} name={name} placeholder={`Tiêu chí ${label.toLowerCase()}…`} /></Field>)}
    <Field label="Reference answer"><Textarea className="min-h-32" defaultValue={rubric?.referenceAnswer ?? ""} name="referenceAnswer" placeholder="Đáp án tham khảo đã kiểm duyệt…" /></Field>
    {errors?.rubric?.[0] ? <ErrorText>{errors.rubric[0]}</ErrorText> : null}
  </CardContent></Card>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{error ? <ErrorText>{error}</ErrorText> : null}</div>;
}
function ErrorText({ children }: { children: React.ReactNode }) { return <p className="text-xs font-semibold text-destructive">{children}</p>; }
const selectClassName = "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50";
