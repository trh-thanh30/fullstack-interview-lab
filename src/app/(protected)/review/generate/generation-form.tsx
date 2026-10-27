"use client";

import { BookOpenText, Braces, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useActionState, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { generateQuestionAction, type GenerateQuestionState } from "../actions";

type SourceOption = {
  id: string;
  heading: string | null;
  pageNumber: number | null;
  excerpt: string;
  topicName: string;
  sourceTitle: string;
};

const initialState: GenerateQuestionState = { message: "" };
const questionTypes = [
  { value: "mcq", label: "Multiple choice", detail: "Bốn lựa chọn, đúng một đáp án" },
  { value: "short_answer", label: "Short answer", detail: "Trả lời ngắn theo rubric" },
  { value: "deep_dive", label: "Deep dive", detail: "Đào sâu cơ chế và trade-off" },
  { value: "system_design", label: "System design", detail: "Thiết kế mở, có checkpoints" },
] as const;

export function GenerationForm({ sources }: { sources: SourceOption[] }) {
  const [state, action, pending] = useActionState(generateQuestionAction, initialState);
  const [selectedType, setSelectedType] = useState("mcq");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  function toggleSource(id: string) {
    setSelectedSources((current) =>
      current.includes(id)
        ? current.filter((sourceId) => sourceId !== id)
        : current.length < 5
          ? [...current, id]
          : current,
    );
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <Card className="rounded-[2rem] bg-ink text-paper shadow-[0_24px_70px_oklch(0.2_0.03_250/.2)]">
          <CardHeader className="border-b border-paper/10">
            <Badge className="bg-accent-strong text-ink"><Sparkles />AI draft</Badge>
            <CardTitle className="mt-4 text-4xl leading-none">Một bản nháp, không phải sự thật cuối cùng.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-6 text-paper/65">
            <p>AI chỉ dùng những source chunks bạn chọn. Kết quả luôn được lưu ở trạng thái draft để bạn kiểm tra trước khi publish.</p>
            <div className="grid gap-3 border-t border-paper/10 pt-5">
              <div className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-strong" /><span>Không có API publish trực tiếp.</span></div>
              <div className="flex gap-3"><Braces className="mt-0.5 size-4 shrink-0 text-accent-strong" /><span>Output phải qua Structured Outputs và Zod.</span></div>
              <div className="flex gap-3"><BookOpenText className="mt-0.5 size-4 shrink-0 text-accent-strong" /><span>Draft giữ liên kết về mọi source đã dùng.</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader><CardTitle className="text-xl">Loại câu hỏi</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {questionTypes.map((type) => (
              <label className={cn("block cursor-pointer rounded-2xl border p-3 transition-colors", selectedType === type.value ? "border-foreground bg-foreground text-background" : "hover:bg-muted/60")} key={type.value}>
                <input className="sr-only" checked={selectedType === type.value} name="type" onChange={() => setSelectedType(type.value)} type="radio" value={type.value} />
                <span className="block text-sm font-extrabold">{type.label}</span>
                <span className={cn("mt-1 block text-xs", selectedType === type.value ? "text-background/65" : "text-muted-foreground")}>{type.detail}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </aside>

      <div>
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">Source context</p><h2 className="mt-1 text-2xl font-extrabold">Chọn tối đa 5 chunks</h2></div>
          <Badge variant="outline">{selectedSources.length} / 5</Badge>
        </div>
        {sources.length ? (
          <div className="mt-4 max-h-[52rem] space-y-3 overflow-y-auto pr-1">
            {sources.map((source) => {
              const selected = selectedSources.includes(source.id);
              const disabled = !selected && selectedSources.length >= 5;
              return (
                <label className={cn("block rounded-2xl border bg-card p-4 transition-all", disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-sm", selected && "border-accent-ink ring-2 ring-accent-strong/25")} key={source.id}>
                  <div className="flex items-start gap-3">
                    <input checked={selected} disabled={disabled} name="sourceChunkIds" onChange={() => toggleSource(source.id)} type="checkbox" value={source.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{source.topicName}</Badge><span className="text-xs font-bold text-muted-foreground">{source.sourceTitle}{source.pageNumber ? ` · trang ${source.pageNumber}` : ""}</span></div>
                      <h3 className="mt-2 font-extrabold">{source.heading ?? "Không có heading"}</h3>
                      <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">{source.excerpt}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed p-12 text-center text-sm text-muted-foreground">Chưa có source chunks đã xử lý và classify. Hãy hoàn thành ingestion trước.</div>
        )}

        <div className="sticky bottom-4 mt-5 rounded-2xl border bg-background/90 p-3 shadow-xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={pending || selectedSources.length === 0} size="lg" type="submit">
              {pending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
              {pending ? "Đang tạo draft…" : "Sinh câu hỏi draft"}
            </Button>
            <p className="text-xs text-muted-foreground">Thường mất vài giây. Không đóng trang trong lúc xử lý.</p>
          </div>
          <p aria-live="polite" className="mt-2 text-sm font-semibold text-destructive">{state.fieldErrors?.sourceChunkIds?.[0] ?? state.fieldErrors?.type?.[0] ?? state.message}</p>
        </div>
      </div>
    </form>
  );
}
