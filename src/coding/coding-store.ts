import { and, asc, desc, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { codingDrafts, codingReviews, interviewSessions, questions, rubrics, sessionQuestions, topics } from "@/db/schema";

import type { CodingReviewOutput } from "./coding-review";

export const codingLanguages = ["typescript", "javascript"] as const;
export type CodingLanguage = (typeof codingLanguages)[number];

export class CodingStore {
  constructor(private readonly database: Database) {}

  async listPublishedQuestions() {
    const rows = await this.database.select({ id: questions.id, prompt: questions.prompt, level: questions.level, topicName: topics.name, rubricId: rubrics.id }).from(questions).innerJoin(topics, eq(topics.id, questions.topicId)).innerJoin(rubrics, eq(rubrics.questionId, questions.id)).where(and(eq(questions.status, "published"), eq(questions.type, "coding"))).orderBy(asc(topics.position), asc(questions.prompt), desc(rubrics.version));
    const seen = new Set<string>();
    return rows.filter(({ id }) => !seen.has(id) && Boolean(seen.add(id)));
  }

  listRecentSessions(userId: string) {
    return this.database.select({ id: interviewSessions.id, state: interviewSessions.state, updatedAt: interviewSessions.updatedAt, prompt: sessionQuestions.promptSnapshot }).from(interviewSessions).innerJoin(sessionQuestions, eq(sessionQuestions.sessionId, interviewSessions.id)).where(and(eq(interviewSessions.userId, userId), eq(interviewSessions.mode, "coding"))).orderBy(desc(interviewSessions.updatedAt)).limit(8);
  }

  async createSession(userId: string, questionId: string, now = new Date()) {
    const [question] = await this.database.select({ id: questions.id, prompt: questions.prompt, explanation: questions.explanation, topicId: questions.topicId, topicName: topics.name }).from(questions).innerJoin(topics, eq(topics.id, questions.topicId)).where(and(eq(questions.id, questionId), eq(questions.type, "coding"), eq(questions.status, "published"))).limit(1);
    if (!question) throw new Error("Coding question không tồn tại hoặc chưa publish.");
    const [rubric] = await this.database.select().from(rubrics).where(eq(rubrics.questionId, questionId)).orderBy(desc(rubrics.version)).limit(1);
    if (!rubric) throw new Error("Coding question chưa có rubric.");
    const [session] = await this.database.insert(interviewSessions).values({ userId, mode: "coding", state: "answering", config: { questionCount: 1 }, currentPosition: 0, startedAt: now, createdAt: now, updatedAt: now }).returning({ id: interviewSessions.id });
    if (!session) throw new Error("Không thể tạo coding session.");
    await this.database.insert(sessionQuestions).values({ sessionId: session.id, questionId, position: 0, questionType: "coding", promptSnapshot: question.prompt, explanationSnapshot: question.explanation, topicIdSnapshot: question.topicId, topicNameSnapshot: question.topicName, rubricSnapshot: { id: rubric.id, version: rubric.version, dimensions: rubric.dimensions, referenceAnswer: rubric.referenceAnswer }, askedAt: now, createdAt: now });
    await this.database.insert(codingDrafts).values({ sessionId: session.id, questionId, language: "typescript", code: "", explanation: "", savedAt: now });
    return session.id;
  }

  async getSession(userId: string, sessionId: string) {
    const [row] = await this.database.select({ session: interviewSessions, question: sessionQuestions, draft: codingDrafts }).from(interviewSessions).innerJoin(sessionQuestions, eq(sessionQuestions.sessionId, interviewSessions.id)).innerJoin(codingDrafts, eq(codingDrafts.sessionId, interviewSessions.id)).where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.userId, userId), eq(interviewSessions.mode, "coding"))).limit(1);
    if (!row) return null;
    const reviews = await this.database.select().from(codingReviews).where(eq(codingReviews.draftId, row.draft.id)).orderBy(desc(codingReviews.createdAt));
    return { ...row, reviews };
  }

  async saveDraft(input: { userId: string; sessionId: string; language: CodingLanguage; code: string; explanation: string; now?: Date }) {
    const session = await this.getSession(input.userId, input.sessionId);
    if (!session) throw new Error("Coding session không tồn tại.");
    const savedAt = input.now ?? new Date();
    await this.database.update(codingDrafts).set({ language: input.language, code: input.code.slice(0, 100_000), explanation: input.explanation.slice(0, 20_000), savedAt }).where(eq(codingDrafts.id, session.draft.id));
    await this.database.update(interviewSessions).set({ updatedAt: savedAt }).where(eq(interviewSessions.id, input.sessionId));
    return savedAt;
  }

  async appendReview(input: { userId: string; sessionId: string; output: CodingReviewOutput; model: string; promptVersion: string; correlationId: string; providerResponseId: string | null; now?: Date }) {
    const session = await this.getSession(input.userId, input.sessionId);
    if (!session) throw new Error("Coding session không tồn tại.");
    if (session.draft.code.trim().length < 20) throw new Error("Code cần ít nhất 20 ký tự trước khi review.");
    const [review] = await this.database.insert(codingReviews).values({ draftId: session.draft.id, language: session.draft.language, codeSnapshot: session.draft.code, explanationSnapshot: session.draft.explanation, executionStatus: "not_run", model: input.model, promptVersion: input.promptVersion, score: input.output.score, complexity: input.output.complexity, correctnessAssumptions: input.output.correctnessAssumptions, edgeCases: input.output.edgeCases, strengths: input.output.strengths, risks: input.output.risks, suggestions: input.output.suggestions, summary: input.output.summary, correlationId: input.correlationId, providerResponseId: input.providerResponseId, createdAt: input.now ?? new Date() }).returning({ id: codingReviews.id });
    return review?.id;
  }
}
