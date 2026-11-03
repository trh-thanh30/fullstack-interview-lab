export type ReviewConfidence = 1 | 2 | 3;

export type ReviewScheduleState = {
  ease: number;
  intervalDays: number;
  repetitions: number;
};

export type ReviewScheduleUpdate = ReviewScheduleState & {
  dueAt: Date;
  quality: number;
};

const DAY_MS = 86_400_000;

export function updateReviewSchedule(input: {
  current?: ReviewScheduleState | null;
  correct: boolean;
  confidence: ReviewConfidence;
  reviewedAt: Date;
}): ReviewScheduleUpdate {
  const current = input.current ?? { ease: 2.5, intervalDays: 0, repetitions: 0 };
  const quality = input.correct ? input.confidence + 2 : Math.max(0, input.confidence - 1);
  const ease = Math.max(
    1.3,
    Number(
      (
        current.ease +
        (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      ).toFixed(2),
    ),
  );

  if (quality < 3) {
    return {
      ease,
      intervalDays: 1,
      repetitions: 0,
      quality,
      dueAt: new Date(input.reviewedAt.getTime() + DAY_MS),
    };
  }

  const repetitions = current.repetitions + 1;
  const intervalDays =
    repetitions === 1
      ? 1
      : repetitions === 2
        ? 6
        : Math.max(1, Math.round(current.intervalDays * ease));

  return {
    ease,
    intervalDays,
    repetitions,
    quality,
    dueAt: new Date(input.reviewedAt.getTime() + intervalDays * DAY_MS),
  };
}

export function normalizeConfidence(value: unknown): ReviewConfidence {
  return value === 1 || value === 3 ? value : 2;
}
