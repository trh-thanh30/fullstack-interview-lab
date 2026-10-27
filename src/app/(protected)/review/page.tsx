import { BookOpenCheck, Filter, ListChecks, Plus, SearchX, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDatabase } from '@/db/client';
import { questionLevelValues, questionStatusValues } from '@/db/schema';
import { cn } from '@/lib/utils';
import { editableQuestionTypeValues } from '@/questions/question-form';
import { QuestionStore, type QuestionFilters } from '@/questions/question-store';

export default function ReviewPage({ searchParams }: PageProps<'/review'>) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <section className="flex flex-col gap-6 border-b border-foreground/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase">
            <BookOpenCheck className="size-4" />
            Question bank
          </div>
          <h1 className="font-heading text-5xl leading-none tracking-tight sm:text-6xl">
            Biên tập trước. Luyện sau.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Quản lý lifecycle, nguồn và rubric của từng câu hỏi. Chỉ nội dung đủ điều kiện mới được
            publish.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 rounded-full px-5')} href="/review/queue"><ListChecks />Review queue</Link>
          <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 rounded-full px-5')} href="/review/generate"><Sparkles />AI generate</Link>
          <Link className={cn(buttonVariants({ size: 'lg' }), 'h-11 rounded-full px-5')} href="/review/new"><Plus />Tạo câu hỏi</Link>
        </div>
      </section>
      <Suspense fallback={<QuestionListSkeleton />}>
        <QuestionBankContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function QuestionBankContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const store = new QuestionStore(getDatabase());
  const options = await store.getEditorOptions();
  const filters = parseFilters(params);
  const rows = await store.list(filters);

  return (
    <>
      {params.archived ? (
        <div
          className="mt-6 rounded-2xl border border-accent-strong/35 bg-accent-soft/60 px-4 py-3 text-sm font-bold text-accent-ink"
          role="status"
        >
          Đã archive câu hỏi.
        </div>
      ) : null}
      <form
        className="mt-8 grid gap-3 rounded-2xl border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
        method="get"
      >
        <span className="flex items-center gap-2 px-2 text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
          <Filter className="size-4" />
          Filters
        </span>
        <FilterSelect defaultValue={filters.topicId} name="topic" label="Category">
          <option value="">All categories</option>
          {options.topics.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect defaultValue={filters.technologyId} name="technology" label="Technology">
          <option value="">All technologies</option>
          {options.technologies.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect defaultValue={filters.level} name="level" label="Level">
          <option value="">All levels</option>
          {questionLevelValues.map((item) => (
            <option key={item} value={item}>
              {label(item)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect defaultValue={filters.type} name="type" label="Type">
          <option value="">All types</option>
          {editableQuestionTypeValues.map((item) => (
            <option key={item} value={item}>
              {label(item)}
            </option>
          ))}
        </FilterSelect>
        <div className="flex gap-2">
          <FilterSelect defaultValue={filters.status} name="status" label="Status">
            <option value="">All statuses</option>
            {questionStatusValues.map((item) => (
              <option key={item} value={item}>
                {label(item)}
              </option>
            ))}
          </FilterSelect>
          <button className={buttonVariants({ variant: 'outline' })} type="submit">
            Lọc
          </button>
        </div>
      </form>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-bold">{rows.length} câu hỏi</p>
        <p className="text-xs text-muted-foreground">Sắp xếp theo cập nhật mới nhất</p>
      </div>
      {rows.length ? (
        <div className="mt-3 overflow-hidden rounded-2xl border bg-card">
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_110px_110px_80px] gap-4 border-b bg-muted/50 px-5 py-3 text-[11px] font-extrabold tracking-wide text-muted-foreground uppercase md:grid">
            <span>Question</span>
            <span>Category</span>
            <span>Type / level</span>
            <span>Status</span>
            <span />
          </div>
          {rows.map((question) => (
            <article
              className="grid gap-3 border-b px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_110px_110px_80px] md:items-center md:gap-4"
              key={question.id}
            >
              <div className="min-w-0">
                <h2 className="line-clamp-2 font-bold leading-5">{question.prompt}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  v{question.version} · cập nhật{' '}
                  {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(
                    question.updatedAt
                  )}
                </p>
              </div>
              <span className="text-sm font-semibold">{question.topicName}</span>
              <span className="text-xs text-muted-foreground">
                {label(question.type)}
                <br />
                {label(question.level)}
              </span>
              <Badge
                variant={
                  question.status === 'published'
                    ? 'default'
                    : question.status === 'archived'
                      ? 'destructive'
                      : 'outline'
                }
              >
                {label(question.status)}
              </Badge>
              <Link
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                href={`/review/${question.id}/edit`}
              >
                Sửa
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <Card className="mt-3 rounded-3xl border-dashed py-16">
          <CardContent className="text-center">
            <SearchX className="mx-auto size-9 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-extrabold">Không có câu hỏi phù hợp</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Đổi filter hoặc tạo câu hỏi đầu tiên.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function FilterSelect({
  label: ariaLabel,
  children,
  ...props
}: React.ComponentProps<'select'> & { label: string }) {
  return (
    <select
      aria-label={ariaLabel}
      className="h-8 min-w-0 rounded-lg border bg-background px-2 text-sm"
      {...props}
    >
      {children}
    </select>
  );
}
function parseFilters(params: Record<string, string | string[] | undefined>): QuestionFilters {
  const single = (key: string) => (typeof params[key] === 'string' ? params[key] : undefined);
  const level = single('level');
  const type = single('type');
  const status = single('status');
  return {
    topicId: validUuid(single('topic')),
    technologyId: validUuid(single('technology')),
    level: questionLevelValues.find((item) => item === level),
    type: editableQuestionTypeValues.find((item) => item === type),
    status: questionStatusValues.find((item) => item === status),
  };
}
function validUuid(value?: string) {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined;
}
function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function QuestionListSkeleton() {
  return (
    <div className="mt-8 space-y-4">
      <Skeleton className="h-14 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
