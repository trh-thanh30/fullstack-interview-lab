"use client";

import { Check, FileImage, LoaderCircle, Network, Paperclip, Sparkles, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { systemDesignCheckpoints } from "@/system-design/checkpoints";

import { addMermaidAttachmentAction, deleteDesignAttachmentAction, reviewSystemDesignAction, saveSystemDesignNotesAction, uploadDiagramAction, type DesignActionState } from "../../actions";

type Review = { id: string; score: number; dimensionScores: Record<string, number>; strengths: string[]; gaps: string[]; assumptions: string[]; tradeoffs: string[]; nextQuestions: string[]; summary: string; createdAt: string };
type DesignDto = {
  id: string; state: string; version: number; currentPosition: number;
  problem: { title: string; level: string; context: string; functionalRequirements: string[]; nonFunctionalRequirements: string[]; constraints: string[]; rubric: Array<{ key: string; label: string; description: string; weight: number }> };
  responses: Array<{ id: string; checkpoint: string; notes: string; savedAt: string; submittedAt: string | null; reviews: Review[] }>;
  attachments: Array<{ id: string; kind: string; filename: string | null; mimeType: string | null; sizeBytes: number | null; mermaidText: string | null; altText: string; createdAt: string }>;
};
const initial: DesignActionState = { status: "idle", message: "" };

export function DesignWorkspace({ session }: { session: DesignDto }) {
  const checkpoint = systemDesignCheckpoints[session.currentPosition] ?? null;
  const response = checkpoint ? session.responses.find((item) => item.checkpoint === checkpoint.key) : null;
  const [notes, setNotes] = useState(response?.notes ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(response ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState(response?.savedAt ?? null);
  const lastSaved = useRef(response?.notes ?? "");
  const [, startSaving] = useTransition();
  const router = useRouter();
  const reviewAction = checkpoint ? reviewSystemDesignAction.bind(null, session.id, checkpoint.key, session.version) : async () => initial;
  const [reviewState, submitReview, reviewing] = useActionState(reviewAction, initial);

  useEffect(() => {
    if (!checkpoint || notes === lastSaved.current) return;
    const timer = window.setTimeout(() => startSaving(async () => {
      try { const result = await saveSystemDesignNotesAction(session.id, checkpoint.key, notes); if (!result.saved) throw new Error(); lastSaved.current = notes; setSavedAt(result.savedAt ?? null); setSaveState("saved"); } catch { setSaveState("error"); }
    }), 700);
    return () => window.clearTimeout(timer);
  }, [checkpoint, notes, session.id]);
  useEffect(() => { if (reviewState.status === "success") router.refresh(); }, [reviewState.status, router]);

  return <div className="mt-6 grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)_22rem]">
    <aside><Card className="sticky top-24 rounded-3xl"><CardHeader><CardTitle className="text-lg">Checkpoints</CardTitle><Progress value={Math.min(100, session.currentPosition / systemDesignCheckpoints.length * 100)} /></CardHeader><CardContent><ol className="space-y-1">{systemDesignCheckpoints.map((item, index) => <li className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold ${index === session.currentPosition ? "bg-foreground text-background" : index < session.currentPosition ? "text-accent-ink" : "text-muted-foreground"}`} key={item.key}><span className="grid size-6 shrink-0 place-items-center rounded-full border text-[10px]">{index < session.currentPosition ? <Check className="size-3" /> : index + 1}</span>{item.label}</li>)}</ol></CardContent></Card></aside>
    <section className="space-y-5"><Card className="rounded-[2rem]"><CardHeader className="border-b"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-black text-accent-ink uppercase">{session.problem.level}</span><span className="rounded-full border px-3 py-1 text-xs font-black uppercase">Reviewed case</span></div><CardTitle className="mt-3 font-heading text-4xl">{session.problem.title}</CardTitle><p className="leading-7 text-muted-foreground">{session.problem.context}</p></CardHeader><CardContent className="grid gap-5 p-6 md:grid-cols-3"><RequirementList title="Functional" values={session.problem.functionalRequirements} /><RequirementList title="Non-functional" values={session.problem.nonFunctionalRequirements} /><RequirementList title="Constraints" values={session.problem.constraints} /></CardContent></Card>
      {checkpoint && response ? <Card className="rounded-[2rem]"><CardHeader><p className="text-xs font-black tracking-widest text-accent-ink uppercase">Checkpoint {session.currentPosition + 1} / 6</p><CardTitle className="font-heading text-4xl">{checkpoint.label}</CardTitle><p className="text-sm leading-6 text-muted-foreground">{checkpoint.prompt}</p></CardHeader><CardContent><form action={submitReview}><Tabs defaultValue="notes"><div className="flex items-center justify-between gap-3"><TabsList><TabsTrigger value="notes">Markdown notes</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList><SaveStatus savedAt={savedAt} state={saveState} /></div><TabsContent value="notes"><Textarea className="mt-3 min-h-[30rem] resize-y rounded-2xl bg-[#161a1d] p-5 font-mono text-sm leading-7 text-[#e8eee9]" disabled={reviewing} name="notes" onChange={(event) => { setNotes(event.target.value); setSaveState("saving"); }} placeholder={'## Assumptions\n- Peak traffic: ...\n\n## Decision\n...'} value={notes} /></TabsContent><TabsContent value="preview"><MarkdownPreview text={notes} /></TabsContent></Tabs><div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{notes.length.toLocaleString("vi-VN")} / 50.000</span><Button className="min-w-48 rounded-xl" disabled={reviewing || notes.trim().length < 30} size="lg" type="submit">{reviewing ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{reviewing ? "Đang review…" : "Review & checkpoint tiếp"}</Button></div>{reviewState.message ? <p className={`mt-3 rounded-xl border p-3 text-sm font-bold ${reviewState.status === "error" ? "text-destructive" : "text-accent-ink"}`}>{reviewState.message}</p> : null}</form></CardContent></Card> : <Summary responses={session.responses} />}
      {session.responses.filter(({ reviews }) => reviews.length).map((item) => <ReviewCard checkpoint={item.checkpoint} key={item.id} review={item.reviews[0]!} />)}
    </section>
    <aside className="space-y-5"><AttachmentPanel attachments={session.attachments} sessionId={session.id} /><Card className="rounded-3xl"><CardHeader><CardTitle className="text-lg">Rubric 7 chiều</CardTitle></CardHeader><CardContent className="space-y-3">{session.problem.rubric.map((item) => <div className="border-b pb-2 last:border-0" key={item.key}><div className="flex justify-between text-xs font-black uppercase"><span>{item.label}</span><span>{item.weight}%</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></div>)}</CardContent></Card></aside>
  </div>;
}

function AttachmentPanel({ attachments, sessionId }: { attachments: DesignDto["attachments"]; sessionId: string }) {
  const router = useRouter();
  const [uploadState, uploadAction, uploading] = useActionState(uploadDiagramAction.bind(null, sessionId), initial);
  const [mermaidState, mermaidAction, savingMermaid] = useActionState(addMermaidAttachmentAction.bind(null, sessionId), initial);
  useEffect(() => { if (uploadState.status === "success" || mermaidState.status === "success") router.refresh(); }, [mermaidState.status, router, uploadState.status]);
  return <Card className="rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Paperclip className="size-4" />Diagrams</CardTitle></CardHeader><CardContent className="space-y-5"><form action={uploadAction} className="space-y-2"><input accept="image/png,image/jpeg,image/webp" className="block w-full text-xs" name="diagram" required type="file" /><input className="h-9 w-full rounded-lg border bg-transparent px-3 text-xs" maxLength={500} name="altText" placeholder="Mô tả sơ đồ cho accessibility" required /><Button className="w-full" disabled={uploading} size="sm" type="submit"><FileImage />{uploading ? "Uploading…" : "Upload private image"}</Button>{uploadState.message ? <p className="text-xs text-muted-foreground">{uploadState.message}</p> : null}</form><div className="border-t pt-4"><form action={mermaidAction} className="space-y-2"><Textarea className="min-h-32 font-mono text-xs" name="mermaidText" placeholder={'graph LR\n  API --> Queue\n  Queue --> Worker'} required /><input className="h-9 w-full rounded-lg border bg-transparent px-3 text-xs" name="altText" placeholder="Mô tả Mermaid" required /><Button className="w-full" disabled={savingMermaid} size="sm" type="submit" variant="outline"><Network />Lưu Mermaid text</Button>{mermaidState.message ? <p className="text-xs text-muted-foreground">{mermaidState.message}</p> : null}</form></div><div className="space-y-3 border-t pt-4">{attachments.map((attachment) => <div className="overflow-hidden rounded-xl border" key={attachment.id}>{attachment.kind === "image" ? <Image alt={attachment.altText} className="h-auto w-full bg-muted object-contain" height={180} src={`/api/design-attachments/${attachment.id}`} unoptimized width={320} /> : <pre className="max-h-40 overflow-auto bg-[#161a1d] p-3 text-[10px] text-[#dce8df]">{attachment.mermaidText}</pre>}<div className="flex items-center justify-between gap-2 p-2"><p className="line-clamp-2 text-[10px] text-muted-foreground">{attachment.altText}</p><form action={deleteDesignAttachmentAction.bind(null, sessionId, attachment.id)}><Button aria-label="Xóa attachment" size="icon-sm" type="submit" variant="ghost"><Trash2 /></Button></form></div></div>)}{attachments.length === 0 ? <p className="text-xs text-muted-foreground">Chưa có diagram. AI vẫn review notes bình thường.</p> : null}</div></CardContent></Card>;
}

function RequirementList({ title, values }: { title: string; values: string[] }) { return <div><p className="text-xs font-black tracking-widest uppercase">{title}</p><ul className="mt-2 space-y-1.5">{values.map((value) => <li className="text-sm leading-6 text-muted-foreground" key={value}>• {value}</li>)}</ul></div>; }
function MarkdownPreview({ text }: { text: string }) { return <div className="mt-3 min-h-[30rem] rounded-2xl border bg-muted/20 p-5"><pre className="whitespace-pre-wrap font-sans text-sm leading-7">{text || "Preview trống."}</pre></div>; }
function SaveStatus({ savedAt, state }: { savedAt: string | null; state: "idle" | "saving" | "saved" | "error" }) { if (state === "saving") return <span className="flex items-center gap-1 text-xs text-muted-foreground"><LoaderCircle className="size-3 animate-spin" />Đang lưu…</span>; if (state === "error") return <span className="text-xs font-bold text-destructive">Autosave lỗi</span>; return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3" />{savedAt ? "Đã lưu" : "Autosave 0,7s"}</span>; }
function ReviewCard({ checkpoint, review }: { checkpoint: string; review: Review }) { return <Card className="rounded-3xl"><CardHeader><div className="flex items-center justify-between"><div><p className="text-xs font-black tracking-widest text-accent-ink uppercase">{checkpoint.replaceAll("_", " ")}</p><CardTitle className="mt-1 text-xl">Checkpoint feedback</CardTitle></div><span className="font-heading text-5xl">{Math.round(review.score)}</span></div></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">{review.summary}</p><div className="grid gap-3 sm:grid-cols-2"><Feedback title="Strengths" values={review.strengths} /><Feedback title="Gaps" values={review.gaps} /><Feedback title="Assumptions" values={review.assumptions} /><Feedback title="Trade-offs" values={review.tradeoffs} /></div></CardContent></Card>; }
function Feedback({ title, values }: { title: string; values: string[] }) { return <div className="rounded-xl border p-3"><p className="text-[10px] font-black tracking-widest uppercase">{title}</p><ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">{values.map((value) => <li key={value}>• {value}</li>)}</ul></div>; }
function Summary({ responses }: { responses: DesignDto["responses"] }) { const scores = responses.flatMap(({ reviews }) => reviews[0] ? [reviews[0].score] : []); const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0; return <Card className="rounded-[2rem] bg-foreground text-background"><CardContent className="grid gap-6 p-8 sm:grid-cols-[1fr_auto] sm:items-end"><div><p className="text-xs font-black tracking-widest text-background/50 uppercase">Session complete</p><h2 className="mt-2 font-heading text-5xl">Architecture is a set of explained decisions.</h2><p className="mt-3 text-sm text-background/60">Sáu checkpoint và toàn bộ diagram đã được lưu. Bạn có thể mở lại session này từ history.</p></div><div className="text-right"><p className="font-heading text-7xl">{Math.round(average)}</p><p className="text-xs text-background/50">checkpoint average</p></div></CardContent></Card>; }
