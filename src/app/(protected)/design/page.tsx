import { ArrowRight, DraftingCompass, History, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDatabase } from '@/db/client';
import { requireAuthenticatedUser } from '@/lib/auth/dal';
import { SystemDesignStore } from '@/system-design/system-design-store';

import { startSystemDesignAction } from './actions';

export default function DesignPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="relative overflow-hidden rounded-[2rem] border bg-[#f0eadf] p-7 sm:p-10">
        <div className="absolute top-0 right-0 h-full w-2/5 bg-[linear-gradient(135deg,transparent_48%,oklch(0.52_0.12_155/.25)_49%,oklch(0.52_0.12_155/.25)_51%,transparent_52%)] bg-[size:32px_32px]" />
        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-black tracking-[.18em] text-accent-ink uppercase">
            <DraftingCompass className="size-4" />
            Phase 6 / Architecture studio
          </p>
          <h1 className="mt-4 font-heading text-5xl leading-[.92] sm:text-7xl">
            Thiết kế bằng quyết định, không bằng logo.
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
            Đi qua sáu checkpoint, ghi assumption và trade-off. Không có một kiến trúc mẫu duy nhất
            để chép lại.
          </p>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_21rem]">
            <Skeleton className="h-[38rem] rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        }
      >
        <DesignIndex />
      </Suspense>
    </main>
  );
}

async function DesignIndex() {
  await connection();
  const user = await requireAuthenticatedUser();
  const store = new SystemDesignStore(getDatabase());
  const [problems, recent] = await Promise.all([
    store.listProblems(),
    store.listRecentSessions(user.id),
  ]);
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-black tracking-widest text-accent-ink uppercase">
              Reviewed templates
            </p>
            <h2 className="font-heading text-4xl">Chọn bài thiết kế</h2>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs font-bold">
            {problems.length} cases
          </span>
        </div>
        <div className="grid gap-4">
          {problems.map((problem, index) => (
            <Card className="rounded-3xl" key={problem.id}>
              <CardContent className="grid gap-5 p-6 sm:grid-cols-[3rem_1fr_auto] sm:items-center">
                <span className="font-heading text-4xl text-muted-foreground/40">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-black uppercase">
                      {problem.level}
                    </span>
                    <span className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase">
                      Reviewed
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold">{problem.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {problem.context}
                  </p>
                </div>
                <form action={startSystemDesignAction}>
                  <input name="problemId" type="hidden" value={problem.id} />
                  <Button className="w-full rounded-xl sm:w-auto" type="submit">
                    Mở studio <ArrowRight />
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <aside className="space-y-5">
        <Card className="rounded-3xl bg-foreground text-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Session gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length ? (
              recent.map((session) => (
                <Link
                  className="block rounded-xl border border-background/15 p-3 text-sm font-bold hover:bg-background/10"
                  href={`/design/session/${session.id}`}
                  key={session.id}
                >
                  <span className="uppercase">{session.state}</span>
                  <span className="mt-1 block text-xs text-background/55">
                    Checkpoint {Math.min(session.currentPosition + 1, 6)} / 6
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-background/60">Chưa có session.</p>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-3 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-ink" />
          <p>
            Diagram ảnh lưu private. Notes và Mermaid được coi là untrusted input khi gửi cho AI.
          </p>
        </div>
      </aside>
    </div>
  );
}
