import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  answerDrafts,
  answers,
  evaluations,
  interviewSessions,
  questionSources,
  questionTechnologies,
  questions,
  rubrics,
  sessionQuestions,
  sourceChunks,
  sources,
  topics,
  type RubricDimension,
} from "@/db/schema";

import type { EssayEvaluationOutput } from "./evaluator";

export type EssayRubricSnapshot = {
  id: string;
  version: number;
  dimensions: RubricDimension[];
  referenceAnswer: string | null;
};

export class EssayStore {
  constructor(private readonly database: Database) {}

  async listPublishedQuestions() {
    const rows = await this.database
      .select({
        id: questions.id,
        prompt: questions.prompt,
        level: questions.level,
        topicName: topics.name,
        rubricId: rubrics.id,
        rubricVersion: rubrics.version,
      })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .innerJoin(rubrics, eq(rubrics.questionId, questions.id))
      .where(and(eq(questions.status, "published"), eq(questions.type, "short_answer")))
      .orderBy(asc(topics.position), asc(questions.prompt), desc(rubrics.version));

    const seen = new Set<string>();
    return rows.filter(({ id }) => !seen.has(id) && Boolean(seen.add(id)));
  }

  async listRecentSessions(userId: string, limit = 8) {
    return this.database
      .select({
        id: interviewSessions.id,
        createdAt: interviewSessions.createdAt,
        updatedAt: interviewSessions.updatedAt,
        prompt: sessionQuestions.promptSnapshot,
        attemptCount: sql<number>`(
          SELECT count(*)::int FROM answers answer
          WHERE answer.session_question_id = ${sessionQuestions.id}
        )`,
      })
      .from(interviewSessions)
      .innerJoin(sessionQuestions, eq(sessionQuestions.sessionId, interviewSessions.id))
      .where(and(eq(interviewSessions.userId, userId), eq(interviewSessions.mode, "short_answer")))
      .orderBy(desc(interviewSessions.updatedAt))
      .limit(limit);
  }

  async createSession(userId: string, questionId: string, now = new Date()) {
    const [question] = await this.database
      .select({
        id: questions.id,
        prompt: questions.prompt,
        explanation: questions.explanation,
        topicId: questions.topicId,
        topicName: topics.name,
      })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(and(
        eq(questions.id, questionId),
        eq(questions.status, "published"),
        eq(questions.type, "short_answer"),
      ))
      .limit(1);
    if (!question) throw new Error("Câu tự luận không tồn tại hoặc chưa được publish.");

    const [rubric] = await this.database
      .select()
      .from(rubrics)
      .where(eq(rubrics.questionId, questionId))
      .orderBy(desc(rubrics.version))
      .limit(1);
    if (!rubric) throw new Error("Câu tự luận chưa có rubric.");

    const [technologyRows, sourceRows] = await Promise.all([
      this.database
        .select({ id: questionTechnologies.technologyId })
        .from(questionTechnologies)
        .where(eq(questionTechnologies.questionId, questionId)),
      this.database
        .select({
          id: sourceChunks.id,
          sourceTitle: sources.title,
          heading: sourceChunks.heading,
          pageNumber: sourceChunks.pageNumber,
        })
        .from(questionSources)
        .innerJoin(sourceChunks, eq(sourceChunks.id, questionSources.sourceChunkId))
        .innerJoin(sources, eq(sources.id, sourceChunks.sourceId))
        .where(eq(questionSources.questionId, questionId)),
    ]);

    const [session] = await this.database
      .insert(interviewSessions)
      .values({
        userId,
        mode: "short_answer",
        state: "answering",
        config: { technologyIds: technologyRows.map(({ id }) => id), questionCount: 1 },
        currentPosition: 0,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: interviewSessions.id });
    if (!session) throw new Error("Không thể tạo essay session.");

    await this.database.insert(sessionQuestions).values({
      sessionId: session.id,
      questionId,
      position: 0,
      questionType: "short_answer",
      promptSnapshot: question.prompt,
      explanationSnapshot: question.explanation,
      topicIdSnapshot: question.topicId,
      topicNameSnapshot: question.topicName,
      sourceSnapshot: sourceRows,
      rubricSnapshot: {
        id: rubric.id,
        version: rubric.version,
        dimensions: rubric.dimensions,
        referenceAnswer: rubric.referenceAnswer,
      } satisfies EssayRubricSnapshot,
      askedAt: now,
      createdAt: now,
    });

    return session.id;
  }

  async getSession(userId: string, sessionId: string) {
    const [row] = await this.database
      .select({
        sessionId: interviewSessions.id,
        state: interviewSessions.state,
        sessionQuestionId: sessionQuestions.id,
        questionId: sessionQuestions.questionId,
        prompt: sessionQuestions.promptSnapshot,
        topicId: sessionQuestions.topicIdSnapshot,
        topicName: sessionQuestions.topicNameSnapshot,
        rubric: sessionQuestions.rubricSnapshot,
        sources: sessionQuestions.sourceSnapshot,
        config: interviewSessions.config,
        draft: answerDrafts.answerText,
        draftSavedAt: answerDrafts.savedAt,
      })
      .from(interviewSessions)
      .innerJoin(sessionQuestions, eq(sessionQuestions.sessionId, interviewSessions.id))
      .leftJoin(answerDrafts, eq(answerDrafts.sessionQuestionId, sessionQuestions.id))
      .where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.userId, userId), eq(interviewSessions.mode, "short_answer")))
      .limit(1);
    if (!row) return null;

    const attemptRows = await this.database
      .select({
        id: answers.id,
        attemptNumber: answers.attemptNumber,
        answerText: answers.answerText,
        submittedAt: answers.submittedAt,
      })
      .from(answers)
      .where(eq(answers.sessionQuestionId, row.sessionQuestionId))
      .orderBy(desc(answers.attemptNumber));

    const attemptIds = attemptRows.map(({ id }) => id);
    const evaluationRows = attemptIds.length
      ? await this.database
          .select()
          .from(evaluations)
          .where(inArray(evaluations.answerId, attemptIds))
          .orderBy(desc(evaluations.createdAt))
      : [];

    return {
      ...row,
      rubric: row.rubric as EssayRubricSnapshot,
      technologyIds: row.config.technologyIds ?? [],
      attempts: attemptRows.map((attempt) => ({
        ...attempt,
        evaluations: evaluationRows.filter(({ answerId }) => answerId === attempt.id),
      })),
    };
  }

  async saveDraft(input: { userId: string; sessionId: string; answerText: string; now?: Date }) {
    const owned = await this.getOwnedQuestion(input.userId, input.sessionId);
    if (!owned) throw new Error("Session không tồn tại.");
    const answerText = input.answerText.slice(0, 30_000);
    const savedAt = input.now ?? new Date();

    await this.database
      .insert(answerDrafts)
      .values({ sessionQuestionId: owned.id, answerText, savedAt })
      .onConflictDoUpdate({
        target: answerDrafts.sessionQuestionId,
        set: { answerText, savedAt },
      });
    await this.database
      .update(interviewSessions)
      .set({ updatedAt: savedAt })
      .where(eq(interviewSessions.id, input.sessionId));
    return savedAt;
  }

  async createAttempt(input: { userId: string; sessionId: string; answerText: string; now?: Date }) {
    const owned = await this.getOwnedQuestion(input.userId, input.sessionId);
    if (!owned) throw new Error("Session không tồn tại.");
    const answerText = input.answerText.trim();
    if (answerText.length < 20) throw new Error("Câu trả lời cần ít nhất 20 ký tự.");
    if (answerText.length > 30_000) throw new Error("Câu trả lời vượt quá 30.000 ký tự.");

    const [latest] = await this.database
      .select({ value: max(answers.attemptNumber) })
      .from(answers)
      .where(eq(answers.sessionQuestionId, owned.id));
    const now = input.now ?? new Date();
    const [answer] = await this.database
      .insert(answers)
      .values({
        sessionQuestionId: owned.id,
        attemptNumber: (latest?.value ?? 0) + 1,
        answerText,
        submittedAt: now,
      })
      .returning({ id: answers.id });
    if (!answer) throw new Error("Không thể lưu answer attempt.");
    await this.database
      .update(interviewSessions)
      .set({ state: "evaluating", updatedAt: now })
      .where(eq(interviewSessions.id, input.sessionId));
    return answer.id;
  }

  async getEvaluationInput(userId: string, sessionId: string, answerId: string) {
    const session = await this.getSession(userId, sessionId);
    if (!session) return null;
    const attempt = session.attempts.find(({ id }) => id === answerId);
    if (!attempt?.answerText) return null;
    return {
      answerId,
      question: session.prompt,
      answer: attempt.answerText,
      rubric: session.rubric,
      topicId: session.topicId,
      technologyIds: session.technologyIds,
    };
  }

  async appendEvaluation(input: {
    sessionId: string;
    answerId: string;
    rubricId: string;
    model: string;
    promptVersion: string;
    output: EssayEvaluationOutput;
    sourceChunkIds: string[];
    correlationId: string;
    providerResponseId: string | null;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    now?: Date;
  }) {
    const dimensions = Object.fromEntries(
      Object.entries(input.output.dimensions).map(([key, value]) => [key, value.score]),
    );
    const dimensionFeedback = Object.fromEntries(
      Object.entries(input.output.dimensions).map(([key, value]) => [key, value.feedback]),
    );
    const [evaluation] = await this.database.insert(evaluations).values({
      answerId: input.answerId,
      rubricId: input.rubricId,
      model: input.model,
      promptVersion: input.promptVersion,
      score: input.output.score,
      dimensions,
      dimensionFeedback,
      strengths: input.output.strengths,
      missingPoints: input.output.missingPoints,
      incorrectClaims: input.output.incorrectClaims,
      uncertainty: input.output.uncertainty,
      suggestedAnswer: input.output.suggestedAnswer,
      followUpQuestion: input.output.followUpQuestion,
      sourceChunkIds: input.sourceChunkIds,
      correlationId: input.correlationId,
      providerResponseId: input.providerResponseId,
      latencyMs: input.latencyMs,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      createdAt: input.now ?? new Date(),
    }).returning({ id: evaluations.id });
    await this.database
      .update(interviewSessions)
      .set({ state: "answering", updatedAt: input.now ?? new Date() })
      .where(eq(interviewSessions.id, input.sessionId));
    return evaluation?.id;
  }

  async markEvaluationFailed(sessionId: string, now = new Date()) {
    await this.database
      .update(interviewSessions)
      .set({ state: "answering", updatedAt: now })
      .where(eq(interviewSessions.id, sessionId));
  }

  private async getOwnedQuestion(userId: string, sessionId: string) {
    const [row] = await this.database
      .select({ id: sessionQuestions.id })
      .from(interviewSessions)
      .innerJoin(sessionQuestions, eq(sessionQuestions.sessionId, interviewSessions.id))
      .where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.userId, userId), eq(interviewSessions.mode, "short_answer")))
      .limit(1);
    return row ?? null;
  }
}

