"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { parsePracticeFormData } from "@/practice/practice-config";
import { PracticeStore } from "@/practice/practice-store";

export type PracticeActionState = { message: string };

export async function startPracticeAction(
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  const user = await requireAuthenticatedUser();
  const parsed = parsePracticeFormData(formData);
  if (!parsed.success) return { message: "Cấu hình practice không hợp lệ." };

  let sessionId: string;
  try {
    sessionId = await new PracticeStore(getDatabase()).createSession({
      userId: user.id,
      configuration: parsed.data,
    });
  } catch (error) {
    return { message: safePracticeError(error, "Không thể tạo session.") };
  }

  revalidatePath("/practice");
  redirect(`/practice/session/${sessionId}`);
}

export async function submitMcqAnswerAction(
  sessionId: string,
  sessionQuestionId: string,
  _previousState: PracticeActionState,
  formData: FormData,
): Promise<PracticeActionState> {
  const user = await requireAuthenticatedUser();
  const parsed = z.uuid().safeParse(formData.get("selectedChoiceId"));
  if (!parsed.success) return { message: "Hãy chọn một đáp án trước khi submit." };

  try {
    await new PracticeStore(getDatabase()).submitAnswer({
      userId: user.id,
      sessionId,
      sessionQuestionId,
      selectedChoiceId: parsed.data,
    });
  } catch (error) {
    return { message: safePracticeError(error, "Không thể lưu đáp án.") };
  }

  revalidatePath(`/practice/session/${sessionId}`);
  return { message: "Đã chấm đáp án." };
}

export async function advancePracticeAction(sessionId: string, sessionQuestionId: string) {
  const user = await requireAuthenticatedUser();
  const result = await new PracticeStore(getDatabase()).advance({
    userId: user.id,
    sessionId,
    sessionQuestionId,
  });
  revalidatePath("/practice");
  revalidatePath(`/practice/session/${sessionId}`);

  if (result.completed) redirect(`/practice/session/${sessionId}/result`);
  redirect(`/practice/session/${sessionId}`);
}

export async function retryWrongAnswersAction(sessionId: string) {
  const user = await requireAuthenticatedUser();
  const newSessionId = await new PracticeStore(getDatabase()).createRetrySession(user.id, sessionId);
  revalidatePath("/practice");
  redirect(`/practice/session/${newSessionId}`);
}

function safePracticeError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  return /^(Không|Chỉ|Question|Session|Câu|Lựa chọn|Hãy)/.test(error.message)
    ? error.message
    : fallback;
}
