import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getDatabase } from '@/db/client';
import { QuestionStore } from '@/questions/question-store';

import { createQuestionAction } from '../actions';
import { QuestionForm } from '../question-form';

export default function NewQuestionPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <EditorHeader />
      <Suspense fallback={<Skeleton className="mt-8 h-[46rem] rounded-3xl" />}>
        <NewQuestionEditor />
      </Suspense>
    </main>
  );
}
async function NewQuestionEditor() {
  await connection();
  const options = await new QuestionStore(getDatabase()).getEditorOptions();
  return (
    <div className="mt-8">
      <QuestionForm action={createQuestionAction} mode="create" options={options} />
    </div>
  );
}
function EditorHeader() {
  return (
    <header>
      <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} href="/review">
        <ArrowLeft />
        Question bank
      </Link>
      <p className="mt-7 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">
        Question bank / New
      </p>
      <h1 className="mt-1 font-heading text-5xl">Tạo câu hỏi</h1>
    </header>
  );
}
