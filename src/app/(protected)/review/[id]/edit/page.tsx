import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getDatabase } from '@/db/client';
import { QuestionStore } from '@/questions/question-store';

import { archiveQuestionAction, updateQuestionAction } from '../../actions';
import { QuestionForm, type QuestionFormValues } from '../../question-form';

export function generateStaticParams() {
  // Cache Components uses one representative value to validate the static shell.
  // The database-backed editor remains deferred behind connection() + Suspense.
  return [{ id: '00000000-0000-4000-8000-000000000000' }];
}
export default function EditQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} href="/review">
          <ArrowLeft />
          Question bank
        </Link>
        <p className="mt-7 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">
          Question bank / Edit
        </p>
        <h1 className="mt-1 font-heading text-5xl">Chỉnh sửa câu hỏi</h1>
      </header>
      <Suspense fallback={<Skeleton className="mt-8 h-[46rem] rounded-3xl" />}>
        <EditQuestionEditor params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
async function EditQuestionEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const store = new QuestionStore(getDatabase());
  const [question, options] = await Promise.all([store.findById(id), store.getEditorOptions()]);
  if (!question) notFound();
  const values: QuestionFormValues = {
    topicId: question.topicId,
    technologyIds: question.technologyIds,
    sourceChunkIds: question.sourceChunkIds,
    type: question.type,
    level: question.level,
    status: question.status,
    prompt: question.prompt,
    explanation: question.explanation ?? '',
    isManual: question.isManual,
    choices: question.choices,
    rubric: question.rubric,
  };
  const action = updateQuestionAction.bind(null, id);
  const archiveAction = archiveQuestionAction.bind(null, id);
  return (
    <div className="mt-8">
      {query.saved || query.created || query.generated ? (
        <div
          className="mb-5 rounded-2xl border border-accent-strong/35 bg-accent-soft/60 px-4 py-3 text-sm font-bold text-accent-ink"
          role="status"
        >
          {query.generated
            ? 'AI draft đã được tạo. Hãy review kỹ trước khi publish.'
            : 'Đã lưu câu hỏi thành công.'}
        </div>
      ) : null}
      <QuestionForm
        action={action}
        archiveAction={archiveAction}
        initialValues={values}
        mode="edit"
        options={options}
      />
    </div>
  );
}
