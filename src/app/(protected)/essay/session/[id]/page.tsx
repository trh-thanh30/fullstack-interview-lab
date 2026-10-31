import { ArrowLeft, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import { EssayStore } from "@/essay/essay-store";
import { requireAuthenticatedUser } from "@/lib/auth/dal";

import { EssayWorkspace } from "./essay-workspace";

export function generateStaticParams() {
  return [{ id: "00000000-0000-4000-8000-000000000000" }];
}

export default function EssaySessionPage({ params }: PageProps<"/essay/session/[id]">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/essay"><ArrowLeft />Essay practice</Link>
        <p className="mt-7 flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase"><BrainCircuit className="size-4" />AI evaluation workspace</p>
        <h1 className="mt-1 font-heading text-5xl">Giải thích, nhận feedback, thử lại.</h1>
      </header>
      <Suspense fallback={<Skeleton className="mt-8 h-[52rem] rounded-3xl" />}>
        <EssaySession params={params} />
      </Suspense>
    </main>
  );
}

async function EssaySession({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const [{ id }, user] = await Promise.all([params, requireAuthenticatedUser()]);
  const session = await new EssayStore(getDatabase()).getSession(user.id, id);
  if (!session) notFound();

  return <EssayWorkspace session={{
    id: session.sessionId,
    sessionQuestionId: session.sessionQuestionId,
    prompt: session.prompt,
    topicName: session.topicName,
    draft: session.draft ?? "",
    draftSavedAt: session.draftSavedAt?.toISOString() ?? null,
    rubric: session.rubric,
    sources: session.sources,
    attempts: session.attempts.map((attempt) => ({
      ...attempt,
      submittedAt: attempt.submittedAt.toISOString(),
      evaluations: attempt.evaluations.map((evaluation) => ({
        ...evaluation,
        createdAt: evaluation.createdAt.toISOString(),
      })),
    })),
  }} />;
}

