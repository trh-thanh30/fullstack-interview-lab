'use client';

import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import type { PracticeConfiguration } from '@/practice/practice-config';

import { startPracticeAction, type PracticeActionState } from './actions';

const initialPracticeActionState: PracticeActionState = { message: '' };

export function StartSessionForm({
  available,
  configuration,
}: {
  available: number;
  configuration: PracticeConfiguration;
}) {
  const [state, action, pending] = useActionState(startPracticeAction, initialPracticeActionState);

  return (
    <form action={action}>
      <input name="topicId" type="hidden" value={configuration.topicId ?? ''} />
      <input name="level" type="hidden" value={configuration.level ?? ''} />
      <input name="questionCount" type="hidden" value={configuration.questionCount} />
      <input name="strategy" type="hidden" value={configuration.strategy} />
      {configuration.technologyIds.map((id) => (
        <input key={id} name="technologyIds" type="hidden" value={id} />
      ))}
      <Button
        className="h-12 w-full rounded-xl text-base"
        disabled={pending || available < configuration.questionCount}
        size="lg"
        type="submit"
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
        {pending ? 'Đang tạo session…' : `Bắt đầu ${configuration.questionCount} câu`}
      </Button>
      {available < configuration.questionCount ? (
        <p className="mt-2 text-xs font-semibold text-destructive">
          Cần giảm số câu xuống tối đa {available}.
        </p>
      ) : null}
      {state.message ? (
        <p aria-live="polite" className="mt-2 text-sm font-semibold text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
