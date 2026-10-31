"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { parseMockInterviewFormData } from "@/mock-interview/config";
import { MockInterviewEngine } from "@/mock-interview/interview-engine";
import { MockInterviewStore } from "@/mock-interview/mock-interview-store";
import { StaleInterviewSessionError } from "@/mock-interview/state-machine";

export type InterviewActionState = { status: "idle" | "error" | "advanced"; message: string; nextUrl?: string };

export async function createMockInterviewAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const parsed = parseMockInterviewFormData(formData);
  if (!parsed.success) redirect("/interview?error=invalid-config");
  const id = await new MockInterviewStore(getDatabase()).createSession({ userId: user.id, configuration: parsed.data });
  revalidatePath("/interview");
  redirect(`/interview/session/${id}`);
}

export async function startMockInterviewAction(sessionId: string, version: number) {
  const user = await requireAuthenticatedUser();
  await new MockInterviewEngine(getDatabase()).start({ userId: user.id, sessionId: z.uuid().parse(sessionId), expectedVersion: z.number().int().parse(version) });
  revalidatePath(`/interview/session/${sessionId}`);
}

export async function recoverMockInterviewAction(sessionId: string, version: number) {
  const user = await requireAuthenticatedUser();
  await new MockInterviewEngine(getDatabase()).recoverAsking({ userId: user.id, sessionId: z.uuid().parse(sessionId), expectedVersion: z.number().int().parse(version) });
  revalidatePath(`/interview/session/${sessionId}`);
}

export async function recoverMockEvaluationAction(sessionId: string, version: number) {
  const user = await requireAuthenticatedUser();
  const result = await new MockInterviewEngine(getDatabase()).recoverEvaluating({ userId: user.id, sessionId: z.uuid().parse(sessionId), expectedVersion: z.number().int().parse(version) });
  revalidatePath(`/interview/session/${sessionId}`);
  if (result.state === "summary") redirect(`/interview/session/${sessionId}/report`);
}

export async function saveMockInterviewDraftAction(sessionId: string, questionId: string, answerText: string) {
  const user = await requireAuthenticatedUser();
  const parsed = z.string().max(30_000).safeParse(answerText);
  if (!parsed.success) return { saved: false, message: "Draft vượt quá 30.000 ký tự." };
  const savedAt = await new MockInterviewStore(getDatabase()).saveDraft({
    userId: user.id,
    sessionId: z.uuid().parse(sessionId),
    questionId: z.uuid().parse(questionId),
    answerText: parsed.data,
  });
  return { saved: true, savedAt: savedAt.toISOString() };
}

export async function submitMockInterviewAnswerAction(
  sessionId: string,
  questionId: string,
  version: number,
  _previous: InterviewActionState,
  formData: FormData,
): Promise<InterviewActionState> {
  const user = await requireAuthenticatedUser();
  try {
    const result = await new MockInterviewEngine(getDatabase()).submit({
      userId: user.id,
      sessionId: z.uuid().parse(sessionId),
      questionId: z.uuid().parse(questionId),
      answerText: String(formData.get("answerText") ?? ""),
      expectedVersion: z.number().int().parse(version),
    });
    const nextUrl = result.state === "summary" ? `/interview/session/${sessionId}/report` : undefined;
    revalidatePath(`/interview/session/${sessionId}`);
    revalidatePath("/interview");
    return { status: "advanced", message: nextUrl ? "Interview đã hoàn tất." : "Đã lưu câu trả lời.", nextUrl };
  } catch (error) {
    return { status: "error", message: publicError(error) };
  }
}

export async function abandonMockInterviewAction(sessionId: string, version: number, from: "setup" | "asking" | "answering" | "follow_up" | "evaluating") {
  const user = await requireAuthenticatedUser();
  await new MockInterviewEngine(getDatabase()).abandon({ userId: user.id, sessionId: z.uuid().parse(sessionId), expectedVersion: z.number().int().parse(version), from });
  revalidatePath("/interview");
  redirect("/interview");
}

function publicError(error: unknown) {
  if (error instanceof StaleInterviewSessionError) return error.message;
  if (error instanceof Error && /^(Câu|Session|Interview|Không thể)/.test(error.message)) return error.message;
  return "Không thể xử lý lượt phỏng vấn. Câu trả lời đã được giữ nếu server nhận thành công.";
}
