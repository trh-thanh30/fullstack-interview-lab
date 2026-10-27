"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDatabase } from "@/db/client";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import {
  parseQuestionFormData,
  type QuestionFormState,
} from "@/questions/question-form";
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
