'use server';

import { randomUUID } from 'node:crypto';

import { del, put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getDatabase } from '@/db/client';
import { publicAiError } from '@/ai/public-error';
import { requireAuthenticatedUser } from '@/lib/auth/dal';
import {
  mermaidAttachmentSchema,
  validateDiagramFile,
} from '@/system-design/attachment-validation';
import { systemDesignCheckpoints, type SystemDesignCheckpoint } from '@/system-design/checkpoints';
import { reviewSystemDesignCheckpoint } from '@/system-design/review-service';
import { SystemDesignStore } from '@/system-design/system-design-store';

export type DesignActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  completed?: boolean;
};

const checkpointSchema = z.enum(
  systemDesignCheckpoints.map(({ key }) => key) as [
    SystemDesignCheckpoint,
    ...SystemDesignCheckpoint[],
  ]
);

export async function startSystemDesignAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const problemId = z.uuid().parse(formData.get('problemId'));
  const sessionId = await new SystemDesignStore(getDatabase()).createSession(user.id, problemId);
  revalidatePath('/design');
  redirect(`/design/session/${sessionId}`);
}

export async function saveSystemDesignNotesAction(
  sessionId: string,
  checkpoint: string,
  notes: string
) {
  const user = await requireAuthenticatedUser();
  const parsed = z.string().max(50_000).safeParse(notes);
  if (!parsed.success) return { saved: false, message: 'Notes vượt quá 50.000 ký tự.' };
  const savedAt = await new SystemDesignStore(getDatabase()).saveNotes({
    userId: user.id,
    sessionId: z.uuid().parse(sessionId),
    checkpoint: checkpointSchema.parse(checkpoint),
    notes: parsed.data,
  });
  return { saved: true, savedAt: savedAt.toISOString() };
}

export async function reviewSystemDesignAction(
  sessionId: string,
  checkpoint: string,
  version: number,
  _previous: DesignActionState,
  formData: FormData
): Promise<DesignActionState> {
  const user = await requireAuthenticatedUser();
  const notes = String(formData.get('notes') ?? '');
  try {
    const parsedCheckpoint = checkpointSchema.parse(checkpoint);
    const store = new SystemDesignStore(getDatabase());
    await store.saveNotes({ userId: user.id, sessionId, checkpoint: parsedCheckpoint, notes });
    const result = await reviewSystemDesignCheckpoint({
      userId: user.id,
      sessionId: z.uuid().parse(sessionId),
      checkpoint: parsedCheckpoint,
      expectedVersion: z.number().int().parse(version),
    });
    revalidatePath(`/design/session/${sessionId}`);
    revalidatePath('/design');
    return {
      status: 'success',
      message:
        result.state === 'summary'
          ? 'Đã hoàn thành system-design session.'
          : 'Checkpoint đã được review.',
      completed: result.state === 'summary',
    };
  } catch (error) {
    return {
      status: 'error',
      message: publicAiError(error, error instanceof Error ? error.message : 'Không thể review checkpoint.'),
    };
  }
}

export async function addMermaidAttachmentAction(
  sessionId: string,
  _previous: DesignActionState,
  formData: FormData
): Promise<DesignActionState> {
  const user = await requireAuthenticatedUser();
  const parsed = mermaidAttachmentSchema.safeParse({
    text: formData.get('mermaidText'),
    altText: formData.get('altText'),
  });
  if (!parsed.success)
    return {
      status: 'error',
      message: 'Mermaid cần ít nhất 10 ký tự và mô tả thay thế ít nhất 5 ký tự.',
    };
  await new SystemDesignStore(getDatabase()).addMermaid({
    userId: user.id,
    sessionId: z.uuid().parse(sessionId),
    text: parsed.data.text,
    altText: parsed.data.altText,
  });
  revalidatePath(`/design/session/${sessionId}`);
  return { status: 'success', message: 'Đã lưu Mermaid diagram.' };
}

export async function uploadDiagramAction(
  sessionId: string,
  _previous: DesignActionState,
  formData: FormData
): Promise<DesignActionState> {
  const user = await requireAuthenticatedUser();
  const file = formData.get('diagram');
  const altText = z.string().trim().min(5).max(500).safeParse(formData.get('altText'));
  if (!(file instanceof File) || !altText.success)
    return { status: 'error', message: 'Hãy chọn ảnh và nhập mô tả thay thế.' };
  const validation = validateDiagramFile(file);
  if (!validation.success) return { status: 'error', message: validation.message };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100) || 'diagram';
  const blob = await put(`design/${sessionId}/${randomUUID()}-${safeName}`, file, {
    access: 'private',
    addRandomSuffix: false,
  });
  try {
    await new SystemDesignStore(getDatabase()).addImage({
      userId: user.id,
      sessionId: z.uuid().parse(sessionId),
      filename: file.name.slice(0, 255),
      mimeType: file.type,
      sizeBytes: file.size,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      altText: altText.data,
    });
  } catch (error) {
    await del(blob.url);
    throw error;
  }
  revalidatePath(`/design/session/${sessionId}`);
  return { status: 'success', message: 'Đã upload private diagram.' };
}

export async function deleteDesignAttachmentAction(sessionId: string, attachmentId: string) {
  const user = await requireAuthenticatedUser();
  const store = new SystemDesignStore(getDatabase());
  const attachment = await store.getOwnedAttachment(user.id, z.uuid().parse(attachmentId));
  if (!attachment || attachment.sessionId !== z.uuid().parse(sessionId))
    throw new Error('Attachment không tồn tại.');
  if (attachment.blobUrl) await del(attachment.blobUrl);
  await store.deleteAttachmentRecord(user.id, attachment.id);
  revalidatePath(`/design/session/${sessionId}`);
}
