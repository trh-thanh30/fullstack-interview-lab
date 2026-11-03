import { ArrowLeft, Braces } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { CodingStore } from '@/coding/coding-store';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getDatabase } from '@/db/client';
import { requireAuthenticatedUser } from '@/lib/auth/dal';

import { CodingWorkspace } from './workspace';

export function generateStaticParams() {
  return [{ id: '00000000-0000-4000-8000-000000000000' }];
}
export default function CodingSessionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 py-7 sm:px-6 lg:px-8">
      <header>
        <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} href="/coding">
          <ArrowLeft />
          Coding problems
        </Link>
        <p className="mt-5 flex items-center gap-2 text-xs font-black tracking-[.18em] text-accent-ink uppercase">
          <Braces className="size-4" />
          Static review workspace
        </p>
        <h1 className="mt-1 font-heading text-4xl sm:text-5xl">
          Write. Explain. Inspect assumptions.
        </h1>
      </header>
      <Suspense fallback={<Skeleton className="mt-6 h-[56rem] rounded-[2rem]" />}>
        <CodingSession params={params} />
      </Suspense>
    </main>
  );
}
async function CodingSession({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const [{ id }, user] = await Promise.all([params, requireAuthenticatedUser()]);
  const data = await new CodingStore(getDatabase()).getSession(user.id, id);
  if (!data) notFound();
  return (
    <CodingWorkspace
      session={{
        id,
        question: {
          prompt: data.question.promptSnapshot,
          explanation: data.question.explanationSnapshot,
          topicName: data.question.topicNameSnapshot,
          rubric: data.question.rubricSnapshot,
        },
        draft: {
          language: data.draft.language,
          code: data.draft.code,
          explanation: data.draft.explanation,
          savedAt: data.draft.savedAt.toISOString(),
        },
        reviews: data.reviews.map((review) => ({
          ...review,
          createdAt: review.createdAt.toISOString(),
        })),
      }}
    />
  );
}
