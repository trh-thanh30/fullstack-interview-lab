import { ArrowLeft, DraftingCompass } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { SystemDesignStore } from "@/system-design/system-design-store";

import { DesignWorkspace } from "./workspace";

export function generateStaticParams() {
  return [{ id: "00000000-0000-4000-8000-000000000000" }];
}

export default function DesignSessionPage({ params }: { params: Promise<{ id: string }> }) {
  return <main className="mx-auto w-full max-w-[92rem] px-4 py-7 sm:px-6 lg:px-8"><header className="flex flex-wrap items-end justify-between gap-4"><div><Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/design"><ArrowLeft />Architecture studio</Link><p className="mt-5 flex items-center gap-2 text-xs font-black tracking-[.18em] text-accent-ink uppercase"><DraftingCompass className="size-4" />System design session</p><h1 className="mt-1 font-heading text-4xl sm:text-5xl">Assumption → decision → trade-off.</h1></div></header><Suspense fallback={<Skeleton className="mt-6 h-[60rem] rounded-[2rem]" />}><DesignSession params={params} /></Suspense></main>;
}

async function DesignSession({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const [{ id }, user] = await Promise.all([params, requireAuthenticatedUser()]);
  const data = await new SystemDesignStore(getDatabase()).getSession(user.id, id);
  if (!data) notFound();
  return <DesignWorkspace session={{
    id,
    state: data.session.state,
    version: data.session.version,
    currentPosition: data.session.currentPosition,
    problem: { title: data.problem.title, level: data.problem.level, context: data.problem.context, functionalRequirements: data.problem.functionalRequirements, nonFunctionalRequirements: data.problem.nonFunctionalRequirements, constraints: data.problem.constraints, rubric: data.problem.rubric },
    responses: data.responses.map((response) => ({ id: response.id, checkpoint: response.checkpoint, notes: response.notes, savedAt: response.savedAt.toISOString(), submittedAt: response.submittedAt?.toISOString() ?? null, reviews: response.reviews.map((review) => ({ ...review, createdAt: review.createdAt.toISOString() })) })),
    attachments: data.attachments.map((attachment) => ({ ...attachment, createdAt: attachment.createdAt.toISOString() })),
  }} />;
}
