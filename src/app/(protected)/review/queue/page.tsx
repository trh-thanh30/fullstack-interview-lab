import { ArrowLeft, ListChecks } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import { QuestionStore } from "@/questions/question-store";

import { ReviewQueue } from "./review-queue";

export default function ReviewQueuePage() {
  return (
    <main className="mx-auto w-full max-w-[96rem] px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-foreground/10 pb-7">
        <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/review">
          <ArrowLeft />Question bank
        </Link>
        <div className="mt-7 flex items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">
              <ListChecks className="size-4" />Editorial desk
            </p>
            <h1 className="mt-1 font-heading text-5xl leading-none sm:text-6xl">Review queue.</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Đối chiếu câu hỏi, đáp án, rubric và source trước khi đưa vào practice.
            </p>
          </div>
        </div>
      </header>
      <Suspense fallback={<Skeleton className="mt-8 h-[48rem] rounded-3xl" />}>
        <ReviewQueueContent />
      </Suspense>
    </main>
  );
}

async function ReviewQueueContent() {
  await connection();
  const questions = await new QuestionStore(getDatabase()).listReviewQueue();
  return <ReviewQueue questions={questions} />;
}
