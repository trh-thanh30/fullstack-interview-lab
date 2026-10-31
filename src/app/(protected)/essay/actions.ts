"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AiProviderError } from "@/ai/provider";
import { getDatabase } from "@/db/client";
import { EssayStore } from "@/essay/essay-store";
import { evaluateAndPersistEssay } from "@/essay/evaluation-service";
import { requireAuthenticatedUser } from "@/lib/auth/dal";

export type EssayActionState = {
  message: string;
  status: "idle" | "saved" | "evaluated" | "error";
  answerId?: string;
};

export async function startEssaySessionAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const questionId = z.uuid().parse(formData.get("questionId"));
  const sessionId = await new EssayStore(getDatabase()).createSession(user.id, questionId);
  revalidatePath("/essay");
  redirect(`/essay/session/${sessionId}`);
}

export async function saveEssayDraftAction(sessionId: string, answerText: string) {
  const user = await requireAuthenticatedUser();
  const parsed = z.string().max(30_000).safeParse(answerText);
  if (!parsed.success) return { saved: false, message: "Draft vượt quá 30.000 ký tự." };
  const savedAt = await new EssayStore(getDatabase()).saveDraft({
    userId: user.id,
    sessionId: z.uuid().parse(sessionId),
    answerText: parsed.data,
  });
  return { saved: true, savedAt: savedAt.toISOString() };
}

export async function submitEssayAction(
  sessionId: string,
  _previousState: EssayActionState,
  formData: FormData,
): Promise<EssayActionState> {
  const user = await requireAuthenticatedUser();
  const answerText = String(formData.get("answerText") ?? "");
  const store = new EssayStore(getDatabase());
  let answerId: string | undefined;

  try {
    await store.saveDraft({ userId: user.id, sessionId, answerText });
    answerId = await store.createAttempt({ userId: user.id, sessionId, answerText });
    await evaluateAndPersistEssay({ userId: user.id, sessionId, answerId });
  } catch (error) {
    return {
      status: "error",
      answerId,
      message: publicEssayError(error),
    };
  }

  revalidatePath(`/essay/session/${sessionId}`);
  revalidatePath("/essay");
  return { status: "evaluated", answerId, message: "Đã lưu attempt và hoàn tất đánh giá." };
}

export async function retryEssayEvaluationAction(
  sessionId: string,
  answerId: string,
  previousState: EssayActionState,
): Promise<EssayActionState> {
  void previousState;
  const user = await requireAuthenticatedUser();
  try {
    await evaluateAndPersistEssay({
      userId: user.id,
      sessionId: z.uuid().parse(sessionId),
      answerId: z.uuid().parse(answerId),
    });
  } catch (error) {
    return { status: "error", answerId, message: publicEssayError(error) };
  }
  revalidatePath(`/essay/session/${sessionId}`);
  return { status: "evaluated", answerId, message: "Đã tạo evaluation mới." };
}

function publicEssayError(error: unknown) {
  if (error instanceof AiProviderError) return `${error.message} Attempt đã được lưu, bạn có thể retry.`;
  if (error instanceof Error && /^(Câu|Session|Answer|Không thể)/.test(error.message)) return error.message;
  return "Không thể đánh giá lúc này. Attempt đã được lưu để bạn retry.";
}

