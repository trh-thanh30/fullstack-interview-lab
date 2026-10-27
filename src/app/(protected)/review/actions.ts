"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { questionReviewActionValues } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { getRequiredEnv } from "@/lib/env";
import {
  editableQuestionTypeValues,
  parseQuestionFormData,
  type QuestionFormState,
} from "@/questions/question-form";
import { generateQuestionDraft } from "@/questions/question-generation";
import { OpenAIQuestionGenerationProvider } from "@/questions/openai-question-generation-provider";
import { QuestionStore } from "@/questions/question-store";

export async function createQuestionAction(
  _previousState: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const user = await requireAuthenticatedUser();
  const parsed = parseQuestionFormData(formData);
  if (!parsed.success) return parsed.state;

  const id = await new QuestionStore(getDatabase()).create(parsed.data, user.id);
  revalidatePath("/review");
  redirect(`/review/${id}/edit?created=1`);
}

export async function updateQuestionAction(
  questionId: string,
  _previousState: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const user = await requireAuthenticatedUser();
  const parsed = parseQuestionFormData(formData);
  if (!parsed.success) return parsed.state;

  await new QuestionStore(getDatabase()).update(questionId, parsed.data, user.id);
  revalidatePath("/review");
  revalidatePath(`/review/${questionId}/edit`);
  redirect(`/review/${questionId}/edit?saved=1`);
}

export async function archiveQuestionAction(questionId: string) {
  await requireAuthenticatedUser();
  await new QuestionStore(getDatabase()).archive(questionId);
  revalidatePath("/review");
  redirect("/review?archived=1");
}

export type GenerateQuestionState = {
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function generateQuestionAction(
  _previousState: GenerateQuestionState,
  formData: FormData,
): Promise<GenerateQuestionState> {
  const user = await requireAuthenticatedUser();
  const parsed = z.object({
    type: z.enum(editableQuestionTypeValues),
    sourceChunkIds: z.array(z.uuid()).min(1, "Chọn ít nhất một source chunk.").max(5),
  }).safeParse({
    type: formData.get("type"),
    sourceChunkIds: formData.getAll("sourceChunkIds"),
  });

  if (!parsed.success) {
    return {
      message: "Hãy kiểm tra loại câu hỏi và source đã chọn.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let generatedQuestionId: string;

  try {
    const repository = new QuestionStore(getDatabase());
    const provider = new OpenAIQuestionGenerationProvider(
      getRequiredEnv("OPENAI_API_KEY"),
      getRequiredEnv("OPENAI_QUESTION_MODEL"),
    );
    const result = await generateQuestionDraft({
      repository,
      provider,
      sourceChunkIds: parsed.data.sourceChunkIds,
      type: parsed.data.type,
      userId: user.id,
    });

    generatedQuestionId = result.id;
  } catch (error) {
    const message = error instanceof Error && (
      error.message.includes("source") || error.message.includes("AI output")
    )
      ? error.message
      : "Không thể sinh câu hỏi lúc này. Hãy thử lại sau.";
    return { message };
  }

  revalidatePath("/review");
  redirect(`/review/${generatedQuestionId}/edit?generated=1`);
}

export type ReviewQuestionState = {
  message: string;
  success?: boolean;
};

const reviewActionSchema = z.object({
  questionId: z.uuid(),
  reviewAction: z.enum(questionReviewActionValues),
  reason: z.string().trim().max(500).optional(),
  mergedIntoQuestionId: z.union([z.uuid(), z.literal("")]).optional(),
});

export async function reviewQuestionAction(
  _previousState: ReviewQuestionState,
  formData: FormData,
): Promise<ReviewQuestionState> {
  const user = await requireAuthenticatedUser();
  const parsed = reviewActionSchema.safeParse({
    questionId: formData.get("questionId"),
    reviewAction: formData.get("reviewAction"),
    reason: formData.get("reason") ?? undefined,
    mergedIntoQuestionId: formData.get("mergedIntoQuestionId") ?? undefined,
  });

  if (!parsed.success) return { message: "Review action không hợp lệ." };

  try {
    await new QuestionStore(getDatabase()).review({
      questionId: parsed.data.questionId,
      reviewerUserId: user.id,
      action: parsed.data.reviewAction,
      reason: parsed.data.reason,
      mergedIntoQuestionId: parsed.data.mergedIntoQuestionId || undefined,
    });
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Không thể hoàn tất review.",
    };
  }

  revalidatePath("/review");
  revalidatePath("/review/queue");
  return { message: "Đã lưu quyết định review.", success: true };
}
