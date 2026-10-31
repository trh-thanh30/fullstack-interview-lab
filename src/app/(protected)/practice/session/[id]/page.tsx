import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { PracticeStore } from "@/practice/practice-store";

import { QuizPlayer } from "./quiz-player";

export function generateStaticParams() {
  return [{ id: "00000000-0000-4000-8000-000000000000" }];
}

export default function PracticeSessionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main>
      <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-6 lg:px-8"><Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/practice"><ArrowLeft />Thoát session</Link></div>
      <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8"><Skeleton className="h-[42rem] rounded-[2rem]" /></div>}>
        <SessionContent params={params} />
      </Suspense>
    </main>
  );
}

async function SessionContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const [{ id }, user] = await Promise.all([params, requireAuthenticatedUser()]);
  const session = await new PracticeStore(getDatabase()).getSessionForPlay(user.id, id);
  if (!session) notFound();
  if (session.state === "completed") redirect(`/practice/session/${id}/result`);
  return <QuizPlayer key={session.question.id} session={session} />;
}
