import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import { QuestionStore } from "@/questions/question-store";

import { GenerationForm } from "./generation-form";

export default function GenerateQuestionPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/review"><ArrowLeft />Question bank</Link>
        <p className="mt-7 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">Question bank / Generate</p>
        <h1 className="mt-1 font-heading text-5xl sm:text-6xl">Biến source thành câu hỏi.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Chọn bằng chứng trước, sau đó để AI đề xuất một draft có cấu trúc để bạn review.</p>
      </header>
      <Suspense fallback={<Skeleton className="mt-8 h-[44rem] rounded-3xl" />}><GenerationContent /></Suspense>
    </main>
  );
}

async function GenerationContent() {
  await connection();
  const sources = await new QuestionStore(getDatabase()).listGenerationSourceOptions();
  return <div className="mt-8"><GenerationForm sources={sources} /></div>;
}
