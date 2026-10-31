import { ArrowRight, Clock3, MessagesSquare, Radio, Target } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getDatabase } from '@/db/client';
import { requireAuthenticatedUser } from '@/lib/auth/dal';
import { MockInterviewStore } from '@/mock-interview/mock-interview-store';

import { createMockInterviewAction } from './actions';

export default function InterviewPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="grid gap-8 border-b border-foreground/10 pb-9 lg:grid-cols-[1fr_21rem] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">
            <MessagesSquare className="size-4" />
            Phase 5 / Mock interview
          </p>
          <h1 className="mt-3 max-w-4xl font-heading text-5xl leading-[.93] tracking-tight sm:text-7xl">
            Đừng luyện câu trả lời. Luyện cách suy nghĩ.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Một vòng phỏng vấn nhiều lượt có giới hạn rõ ràng. Gemini chỉ được chọn follow-up trong
            phạm vi state machine và question bank đã duyệt.
          </p>
        </div>
        <div className="rounded-3xl bg-ink p-5 text-paper shadow-[8px_8px_0_var(--accent-strong)]">
          <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-paper/45 uppercase">
            <Radio className="size-3" />
            Interview protocol
          </p>
          <p className="mt-3 font-heading text-3xl">Think aloud.</p>
          <p className="mt-2 text-sm leading-6 text-paper/60">
            Không hiện điểm giữa buổi. Mỗi lượt được autosave và có thể resume trên thiết bị khác.
          </p>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
            <Skeleton className="h-[38rem] rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        }
      >
        <InterviewIndex />
      </Suspense>
    </main>
  );
}

async function InterviewIndex() {
  await connection();
  const user = await requireAuthenticatedUser();
  const store = new MockInterviewStore(getDatabase());
  const [options, recent] = await Promise.all([
    store.getConfigurationOptions(),
    store.listRecentSessions(user.id),
  ]);
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="rounded-[2rem]">
        <CardHeader>
          <p className="text-xs font-extrabold tracking-widest text-accent-ink uppercase">
            Setup room
          </p>
          <CardTitle className="font-heading text-4xl">Cấu hình vòng phỏng vấn</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMockInterviewAction} className="space-y-7">
            <fieldset>
              <legend className="text-sm font-extrabold">Chủ đề muốn kiểm tra</legend>
              <p className="mt-1 text-xs text-muted-foreground">
                Bỏ trống để engine phủ đều toàn bộ topic.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {options.topics.map((topic) => (
                  <Label
                    className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-muted/40"
                    key={topic.id}
                  >
                    <input
                      className="size-4 accent-current"
                      name="topicIds"
                      type="checkbox"
                      value={topic.id}
                    />
                    {topic.name}
                  </Label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-extrabold">Technology focus</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {options.technologies.map((technology) => (
                  <Label
                    className="cursor-pointer rounded-full border px-3 py-2 text-xs font-bold has-checked:border-accent-strong has-checked:bg-accent-soft"
                    key={technology.id}
                  >
                    <input
                      className="sr-only"
                      name="technologyIds"
                      type="checkbox"
                      value={technology.id}
                    />
                    {technology.name}
                  </Label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Select defaultValue="middle" name="level">
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="middle">Middle</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="questionCount">Câu chính</Label>
                <Input
                  defaultValue="5"
                  id="questionCount"
                  max="12"
                  min="2"
                  name="questionCount"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Thời lượng (phút)</Label>
                <Input
                  defaultValue="35"
                  id="durationMinutes"
                  max="120"
                  min="10"
                  name="durationMinutes"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxFollowUpsPerQuestion">Follow-up / câu</Label>
                <Input
                  defaultValue="1"
                  id="maxFollowUpsPerQuestion"
                  max="3"
                  min="0"
                  name="maxFollowUpsPerQuestion"
                  type="number"
                />
              </div>
            </div>
            <Button className="w-full rounded-xl" size="lg" type="submit">
              Tạo interview room <ArrowRight />
            </Button>
          </form>
        </CardContent>
      </Card>
      <aside className="space-y-5">
        <Card className="rounded-3xl bg-accent-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="size-4" />
              Interview gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length ? (
              recent.map((session) => (
                <Link
                  className="group block rounded-xl border bg-background/70 p-3 transition hover:bg-background"
                  href={
                    session.state === 'summary' || session.state === 'completed'
                      ? `/interview/session/${session.id}/report`
                      : `/interview/session/${session.id}`
                  }
                  key={session.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black tracking-wide uppercase">
                      {session.state}
                    </span>
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-2 text-sm font-bold">
                    {session.config.questionCount ?? 5} câu · {session.config.durationMinutes ?? 35}{' '}
                    phút
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có mock interview.</p>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-3 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          <Target className="mt-0.5 size-4 shrink-0 text-accent-ink" />
          <p>
            Rule engine ưu tiên coverage trước. AI không được tự tạo câu chính ngoài question bank.
          </p>
        </div>
      </aside>
    </div>
  );
}
