import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  answerDrafts,
  answers,
  codingDrafts,
  codingReviews,
  designAttachments,
  evaluations,
  interviewSessions,
  questionReviewEvents,
  questions,
  reviewSchedules,
  sessionQuestions,
  systemDesignCheckpointResponses,
  systemDesignReviews,
  users,
} from "@/db/schema";

export class PrivacyStore {
  constructor(private readonly database: Database) {}

  async exportUserData(userId: string) {
    const [profile] = await this.database.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!profile) throw new Error("User không tồn tại.");
    const [sessions, schedules, reviewEvents, authoredQuestions] = await Promise.all([
      this.database.select().from(interviewSessions).where(eq(interviewSessions.userId, userId)),
      this.database.select().from(reviewSchedules).where(eq(reviewSchedules.userId, userId)),
      this.database.select().from(questionReviewEvents).where(eq(questionReviewEvents.reviewerUserId, userId)),
      this.database.select().from(questions).where(or(eq(questions.createdByUserId, userId), eq(questions.reviewedByUserId, userId))),
    ]);
    const sessionIds = sessions.map(({ id }) => id);
    const sessionQuestionRows = sessionIds.length
      ? await this.database.select().from(sessionQuestions).where(inArray(sessionQuestions.sessionId, sessionIds))
      : [];
    const sessionQuestionIds = sessionQuestionRows.map(({ id }) => id);
    const answerRows = sessionQuestionIds.length
      ? await this.database.select().from(answers).where(inArray(answers.sessionQuestionId, sessionQuestionIds))
      : [];
    const answerIds = answerRows.map(({ id }) => id);
    const [draftRows, evaluationRows, checkpointRows, attachmentRows, codingDraftRows] = await Promise.all([
      sessionQuestionIds.length ? this.database.select().from(answerDrafts).where(inArray(answerDrafts.sessionQuestionId, sessionQuestionIds)) : [],
      answerIds.length ? this.database.select().from(evaluations).where(inArray(evaluations.answerId, answerIds)) : [],
      sessionIds.length ? this.database.select().from(systemDesignCheckpointResponses).where(inArray(systemDesignCheckpointResponses.sessionId, sessionIds)) : [],
      sessionIds.length ? this.database.select().from(designAttachments).where(inArray(designAttachments.sessionId, sessionIds)) : [],
      sessionIds.length ? this.database.select().from(codingDrafts).where(inArray(codingDrafts.sessionId, sessionIds)) : [],
    ]);
    const checkpointIds = checkpointRows.map(({ id }) => id);
    const codingDraftIds = codingDraftRows.map(({ id }) => id);
    const [designReviewRows, codingReviewRows] = await Promise.all([
      checkpointIds.length ? this.database.select().from(systemDesignReviews).where(inArray(systemDesignReviews.responseId, checkpointIds)) : [],
      codingDraftIds.length ? this.database.select().from(codingReviews).where(inArray(codingReviews.draftId, codingDraftIds)) : [],
    ]);
    return {
      format: "interview-lab-personal-export-v1",
      exportedAt: new Date().toISOString(),
      profile,
      sessions,
      sessionQuestions: sessionQuestionRows,
      answers: answerRows,
      answerDrafts: draftRows,
      evaluations: evaluationRows,
      systemDesignCheckpoints: checkpointRows,
      systemDesignReviews: designReviewRows,
      designAttachments: attachmentRows.map((attachment) => ({
        id: attachment.id,
        sessionId: attachment.sessionId,
        kind: attachment.kind,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        mermaidText: attachment.mermaidText,
        altText: attachment.altText,
        createdAt: attachment.createdAt,
      })),
      codingDrafts: codingDraftRows,
      codingReviews: codingReviewRows,
      reviewSchedules: schedules,
      authoredOrReviewedQuestions: authoredQuestions,
      questionReviewEvents: reviewEvents,
    };
  }

  async listOwnedBlobUrls(userId: string) {
    const rows = await this.database
      .select({ url: designAttachments.blobUrl })
      .from(designAttachments)
      .innerJoin(interviewSessions, eq(interviewSessions.id, designAttachments.sessionId))
      .where(and(eq(interviewSessions.userId, userId), eq(designAttachments.kind, "image")));
    return rows.flatMap(({ url }) => url ? [url] : []);
  }

  async deleteUserData(userId: string) {
    const [, deleted] = await this.database.batch([
      this.database.delete(questionReviewEvents).where(eq(questionReviewEvents.reviewerUserId, userId)),
      this.database.delete(users).where(eq(users.id, userId)).returning({ id: users.id }),
    ]);
    if (!deleted.length) return;
    return userId;
  }
}
