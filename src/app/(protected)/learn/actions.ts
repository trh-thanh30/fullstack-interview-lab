"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { LearningStore } from "@/learning/learning-store";
import { narrateLearningPlan } from "@/learning/plan-narrator";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { PracticeStore } from "@/practice/practice-store";

export type LearningPlanActionState = {
  status: "idle" | "success" | "error";
  message: string;
  actions: string[];
};

export async function startRecommendedPracticeAction(topicId: string) {
  const user = await requireAuthenticatedUser();
  const parsedTopicId = z.uuid().parse(topicId);
  const store = new PracticeStore(getDatabase());
  const base = {
    topicId: parsedTopicId,
    technologyIds: [],
    level: undefined,
    questionCount: 5,
    strategy: "weak_first" as const,
  };
  const available = await store.countAvailable(base);
  if (!available) throw new Error("Topic này chưa có MCQ published để luyện.");
  const sessionId = await store.createSession({
    userId: user.id,
    configuration: { ...base, questionCount: Math.min(5, available) },
  });
  revalidatePath("/learn");
  redirect(`/practice/session/${sessionId}`);
}

export async function startDailyReviewAction() {
  const user = await requireAuthenticatedUser();
  const database = getDatabase();
  const queue = await new LearningStore(database).getDailyQueue(user.id);
  if (!queue.length) throw new Error("Daily queue đang trống.");
  const sessionId = await new PracticeStore(database).createSession({
    userId: user.id,
    questionIds: queue.map(({ questionId }) => questionId),
    configuration: {
      topicId: undefined,
      technologyIds: [],
      level: undefined,
      questionCount: queue.length,
      strategy: "weak_first",
    },
  });
  revalidatePath("/learn");
  redirect(`/practice/session/${sessionId}`);
}

export async function resetReviewScheduleAction(questionId: string) {
  const user = await requireAuthenticatedUser();
  await new LearningStore(getDatabase()).resetSchedule(user.id, z.uuid().parse(questionId));
  revalidatePath("/learn");
}

export async function narrateLearningPlanAction(
  previous: LearningPlanActionState,
): Promise<LearningPlanActionState> {
  void previous;
  const user = await requireAuthenticatedUser();
  try {
    const recommendations = await new LearningStore(getDatabase()).getRecommendations(user.id);
    const plan = await narrateLearningPlan(recommendations);
    return { status: "success", message: plan.summary, actions: plan.actions };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Không thể tạo lời giải thích lúc này.",
      actions: [],
    };
  }
}
