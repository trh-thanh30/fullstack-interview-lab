import { ArrowRight, Braces, History, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { CodingStore } from '@/coding/coding-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDatabase } from '@/db/client';
import { requireAuthenticatedUser } from '@/lib/auth/dal';

import { startCodingSessionAction } from './actions';

export default function CodingPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="grid gap-7 border-b pb-9 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-black tracking-[.18em] text-accent-ink uppercase">
            <Braces className="size-4" />
            Phase 6 / Coding workspace
          </p>
          <h1 className="mt-3 font-heading text-5xl leading-[.93] sm:text-7xl">
            Code là lập luận có thể đọc được.
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
            Viết TypeScript hoặc JavaScript, giải thích assumption và nhận static review. Không có
            code nào được thực thi trên Vercel.
          </p>
        </div>
        <div className="rounded-3xl bg-[#161a1d] p-5 font-mono text-sm text-[#dce8df] shadow-[8px_8px_0_var(--accent-strong)]">
          <p className="text-[#79d6a3]">$ review --static</p>
          <p className="mt-3 text-white/55">execution_status: not_run</p>
          <p className="text-white/55">sandbox: intentionally_absent</p>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_21rem]">
            <Skeleton className="h-[36rem] rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        }
      >
        <CodingIndex />
      </Suspense>
    </main>
  );
}

async function CodingIndex() {
  await connection();
  const user = await requireAuthenticatedUser();
  const store = new CodingStore(getDatabase());
  const [questions, recent] = await Promise.all([
    store.listPublishedQuestions(),
    store.listRecentSessions(user.id),
  ]);
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-black tracking-widest text-accent-ink uppercase">
              Published problems
            </p>
            <h2 className="font-heading text-4xl">Chọn coding prompt</h2>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs font-bold">
            {questions.length} available
          </span>
        </div>
        <div className="space-y-4">
          {questions.length ? (
            questions.map((question, index) => (
              <Card className="rounded-3xl" key={question.id}>
                <CardContent className="grid gap-5 p-6 sm:grid-cols-[3rem_1fr_auto] sm:items-center">
                  <span className="font-heading text-4xl text-muted-foreground/40">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="flex gap-2">
                      <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-black uppercase">
                        {question.topicName}
                      </span>
                      <span className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase">
                        {question.level}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold leading-7">{question.prompt}</h3>
                  </div>
                  <form action={startCodingSessionAction}>
                    <input name="questionId" type="hidden" value={question.id} />
                    <Button className="w-full rounded-xl sm:w-auto" type="submit">
                      Mở editor <ArrowRight />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed p-10 text-center">
              <Braces className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-bold">Chưa có coding question đã publish.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tạo question type Coding kèm rubric trong Question bank.
              </p>
            </div>
          )}
        </div>
      </section>
      <aside className="space-y-5">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Draft gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length ? (
              recent.map((session) => (
                <Link
                  className="block rounded-xl border p-3 text-sm font-bold hover:bg-muted"
                  href={`/coding/session/${session.id}`}
                  key={session.id}
                >
                  <span className="line-clamp-2">{session.prompt}</span>
                  <span className="mt-2 block text-xs text-muted-foreground">Resume editor →</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có coding draft.</p>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-3 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-accent-ink" />
          <p>
            Workspace không cung cấp Run. Feedback chỉ phân tích text, complexity assumption và edge
            case.
          </p>
        </div>
      </aside>
    </div>
  );
}
