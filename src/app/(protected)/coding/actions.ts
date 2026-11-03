'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { CodingStore, codingLanguages } from '@/coding/coding-store';
import { reviewAndPersistCode } from '@/coding/review-service';
import { getDatabase } from '@/db/client';
import { requireAuthenticatedUser } from '@/lib/auth/dal';

export type CodingActionState = { status: 'idle' | 'success' | 'error'; message: string };

const draftSchema = z.object({
  language: z.enum(codingLanguages),
  code: z.string().max(100_000),
  explanation: z.string().max(20_000),
});

export async function startCodingSessionAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const sessionId = await new CodingStore(getDatabase()).createSession(
    user.id,
    z.uuid().parse(formData.get('questionId'))
  );
  revalidatePath('/coding');
  redirect(`/coding/session/${sessionId}`);
}

export async function saveCodingDraftAction(
  sessionId: string,
  input: { language: string; code: string; explanation: string }
) {
  const user = await requireAuthenticatedUser();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { saved: false, message: 'Draft không hợp lệ hoặc vượt giới hạn.' };
  const savedAt = await new CodingStore(getDatabase()).saveDraft({
    userId: user.id,
    sessionId: z.uuid().parse(sessionId),
    ...parsed.data,
  });
  return { saved: true, savedAt: savedAt.toISOString() };
}

export async function reviewCodingAction(
  sessionId: string,
  _previous: CodingActionState,
  formData: FormData
): Promise<CodingActionState> {
  const user = await requireAuthenticatedUser();
  const parsed = draftSchema.safeParse({
    language: formData.get('language'),
    code: formData.get('code'),
    explanation: formData.get('explanation'),
  });
  if (!parsed.success || parsed.data.code.trim().length < 20)
    return { status: 'error', message: 'Code cần ít nhất 20 ký tự và không vượt giới hạn.' };
  try {
    const store = new CodingStore(getDatabase());
    await store.saveDraft({ userId: user.id, sessionId, ...parsed.data });
    await reviewAndPersistCode(user.id, z.uuid().parse(sessionId));
    revalidatePath(`/coding/session/${sessionId}`);
    revalidatePath('/coding');
    return { status: 'success', message: 'Static review đã hoàn tất. Code không được thực thi.' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Không thể review code lúc này.',
    };
  }
}
