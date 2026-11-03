"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import {
  narrateLearningPlanAction,
  type LearningPlanActionState,
} from "./actions";

const initialState: LearningPlanActionState = { status: "idle", message: "", actions: [] };

export function PlanNarrator() {
  const [state, action, pending] = useActionState(narrateLearningPlanAction, initialState);

  return (
    <div className="rounded-[1.75rem] border border-foreground/10 bg-ink p-5 text-paper shadow-[8px_8px_0_var(--accent-strong)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold tracking-[.18em] text-accent-strong uppercase">
            Gemini coach
          </p>
          <h3 className="mt-2 font-heading text-3xl">Giải thích kế hoạch</h3>
        </div>
        <Sparkles className="size-5 text-accent-strong" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm leading-6 text-paper/60">
        AI chỉ diễn giải ranking deterministic. Score và thứ hạng không được AI thay đổi.
      </p>
      <form action={action} className="mt-5">
        <Button className="rounded-full bg-paper text-ink hover:bg-paper/90" disabled={pending} type="submit">
          {pending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
          {pending ? "Đang phân tích…" : "Viết kế hoạch ngắn"}
        </Button>
      </form>
      {state.message ? (
        <div className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${state.status === "error" ? "bg-destructive/20 text-red-100" : "bg-paper/8"}`}>
          <p>{state.message}</p>
          {state.actions.length ? (
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-paper/75">
              {state.actions.map((item) => <li key={item}>{item}</li>)}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
