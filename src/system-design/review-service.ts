import { get } from '@vercel/blob';

import { AiCallLogger } from '@/ai/ai-call-log';
import { GeminiStructuredProvider } from '@/ai/gemini-provider';
import { getDatabase } from '@/db/client';
import { getRequiredEnv } from '@/lib/env';

import { type SystemDesignCheckpoint } from './checkpoints';
import { evaluateSystemDesign, SYSTEM_DESIGN_PROMPT_VERSION } from './evaluator';
import { SystemDesignStore } from './system-design-store';

export async function reviewSystemDesignCheckpoint(input: {
  userId: string;
  sessionId: string;
  checkpoint: SystemDesignCheckpoint;
  expectedVersion: number;
}) {
  const database = getDatabase();
  const store = new SystemDesignStore(database);
  const reviewInput = await store.getReviewInput(
    input.userId,
    input.sessionId,
    input.expectedVersion,
    input.checkpoint
  );
  if (!reviewInput)
    throw new Error('Session đã thay đổi. Hãy tải lại checkpoint trước khi review.');
  if (!reviewInput) throw new Error('Session hoặc checkpoint đã thay đổi.');
  const apiKey = getRequiredEnv('GOOGLE_GENERATIVE_AI_API_KEY');
  const provider = new GeminiStructuredProvider(
    apiKey,
    process.env.GEMINI_EVALUATION_MODEL?.trim() || 'gemini-2.5-flash'
  );
  const imageAttachments = reviewInput.attachments
    .filter((item) => item.kind === 'image' && item.blobPathname && item.mimeType)
    .slice(0, 3);
  const images = await Promise.all(
    imageAttachments.map(async (attachment) => {
      const blob = await get(attachment.blobPathname!, { access: 'private' });
      if (!blob?.stream || blob.statusCode !== 200) return null;
      const data = new Uint8Array(await new Response(blob.stream).arrayBuffer());
      return { data, mediaType: attachment.mimeType as 'image/png' | 'image/jpeg' | 'image/webp' };
    })
  );
  const mermaid = reviewInput.attachments
    .filter((item) => item.kind === 'mermaid' && item.mermaidText)
    .map((item) => `<mermaid>\n${item.mermaidText}\n</mermaid>`)
    .join('\n');
  const result = await evaluateSystemDesign({
    provider,
    logger: new AiCallLogger(database),
    problem: reviewInput.problem,
    checkpoint: input.checkpoint,
    checkpointPrompt: reviewInput.currentCheckpoint!.prompt,
    notes: `${reviewInput.response.notes}${mermaid ? `\n\n${mermaid}` : ''}`,
    previousNotes: reviewInput.previousNotes,
    images: images.filter((image): image is NonNullable<typeof image> => Boolean(image)),
  });
  const state = await store.completeCheckpoint({
    userId: input.userId,
    sessionId: input.sessionId,
    expectedVersion: input.expectedVersion,
    responseId: reviewInput.response.id,
    review: result.output,
    model: result.model,
    promptVersion: SYSTEM_DESIGN_PROMPT_VERSION,
    correlationId: result.correlationId,
    providerResponseId: result.providerResponseId,
  });
  return { state, review: result.output };
}
