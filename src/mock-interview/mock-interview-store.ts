import { randomUUID } from 'node:crypto';

import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '@/db/client';
import {
  answerDrafts,
  answers,
  evaluations,
  interviewSessions,
  questions,
  questionSources,
  questionTechnologies,
  rubrics,
  sessionQuestions,
  sourceChunks,
  sources,
  technologies,
  topics,
} from '@/db/schema';
import type { EssayEvaluationOutput } from '@/essay/evaluator';

import type { MockInterviewConfiguration } from './config';
import {
  assertInterviewTransition,
  StaleInterviewSessionError,
  type InterviewState,
} from './state-machine';

type Candidate = {
  id: string;
  prompt: string;
  explanation: string | null;
  type: 'short_answer' | 'deep_dive';
  level: 'junior' | 'middle' | 'senior';
  topicId: string;
  topicName: string;
  rubricId: string;
  rubricVersion: number;
  rubricDimensions: Array<{ key: string; label: string; description: string; weight: number }>;
  referenceAnswer: string | null;
  technologyIds: string[];
};

export class MockInterviewStore {
  constructor(private readonly database: Database) {}

  async getConfigurationOptions() {
    const [topicRows, technologyRows] = await Promise.all([
      this.database
        .select({ id: topics.id, name: topics.name })
        .from(topics)
        .orderBy(asc(topics.position)),
      this.database
        .select({
          id: technologies.id,
          name: technologies.name,
          topicId: technologies.primaryTopicId,
        })
        .from(technologies)
        .orderBy(asc(technologies.name)),
    ]);
    return { topics: topicRows, technologies: technologyRows };
  }

  async listRecentSessions(userId: string, limit = 8) {
    const rows = await this.database
      .select({
        id: interviewSessions.id,
        state: interviewSessions.state,
        config: interviewSessions.config,
        currentPosition: interviewSessions.currentPosition,
        startedAt: interviewSessions.startedAt,
        updatedAt: interviewSessions.updatedAt,
        completedAt: interviewSessions.completedAt,
      })
      .from(interviewSessions)
      .where(
        and(eq(interviewSessions.userId, userId), eq(interviewSessions.mode, 'mock_interview'))
      )
      .orderBy(desc(interviewSessions.updatedAt))
      .limit(limit);
    return rows;
  }

  async createSession(input: {
    userId: string;
    configuration: MockInterviewConfiguration;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const id = randomUUID();
    await this.database.insert(interviewSessions).values({
      id,
      userId: input.userId,
      mode: 'mock_interview',
      state: 'setup',
      config: input.configuration,
      currentPosition: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  async getOwnedSession(userId: string, sessionId: string) {
    const [session] = await this.database
      .select()
      .from(interviewSessions)
      .where(
        and(
          eq(interviewSessions.id, sessionId),
          eq(interviewSessions.userId, userId),
          eq(interviewSessions.mode, 'mock_interview')
        )
      )
      .limit(1);
    return session ?? null;
  }

  async transition(input: {
    userId: string;
    sessionId: string;
    expectedVersion: number;
    from: InterviewState;
    to: InterviewState;
    now?: Date;
    currentPosition?: number;
    startClock?: boolean;
  }) {
    assertInterviewTransition(input.from, input.to);
    const now = input.now ?? new Date();
    const session = await this.getOwnedSession(input.userId, input.sessionId);
    if (!session || session.state !== input.from || session.version !== input.expectedVersion) {
      throw new StaleInterviewSessionError();
    }
    const duration = session.config.durationMinutes ?? 35;
    const [updated] = await this.database
      .update(interviewSessions)
      .set({
        state: input.to,
        version: sql`${interviewSessions.version} + 1`,
        currentPosition: input.currentPosition ?? session.currentPosition,
        startedAt: input.startClock ? now : session.startedAt,
        deadlineAt: input.startClock
          ? new Date(now.getTime() + duration * 60_000)
          : session.deadlineAt,
        completedAt:
          input.to === 'summary' || input.to === 'completed' || input.to === 'abandoned'
            ? now
            : session.completedAt,
        updatedAt: now,
      })
      .where(
        and(
          eq(interviewSessions.id, input.sessionId),
          eq(interviewSessions.userId, input.userId),
          eq(interviewSessions.state, input.from),
          eq(interviewSessions.version, input.expectedVersion)
        )
      )
      .returning({ version: interviewSessions.version });
    if (!updated) throw new StaleInterviewSessionError();
    return updated.version;
  }

  async chooseNextQuestion(userId: string, sessionId: string) {
    const session = await this.getOwnedSession(userId, sessionId);
    if (!session) throw new Error('Session không tồn tại.');
    const config = session.config;
    const [candidateRows, technologyRows, usedRows, coverageRows] = await Promise.all([
      this.database
        .select({
          id: questions.id,
          prompt: questions.prompt,
          explanation: questions.explanation,
          type: questions.type,
          level: questions.level,
          topicId: questions.topicId,
          topicName: topics.name,
          rubricId: rubrics.id,
          rubricVersion: rubrics.version,
          rubricDimensions: rubrics.dimensions,
          referenceAnswer: rubrics.referenceAnswer,
        })
        .from(questions)
        .innerJoin(topics, eq(topics.id, questions.topicId))
        .innerJoin(rubrics, eq(rubrics.questionId, questions.id))
        .where(
          and(
            eq(questions.status, 'published'),
            inArray(questions.type, ['short_answer', 'deep_dive'])
          )
        )
        .orderBy(desc(rubrics.version), asc(questions.createdAt)),
      this.database.select().from(questionTechnologies),
      this.database
        .select({ questionId: sessionQuestions.questionId })
        .from(sessionQuestions)
        .where(eq(sessionQuestions.sessionId, sessionId)),
      this.database
        .select({ topicId: sessionQuestions.topicIdSnapshot, value: count() })
        .from(sessionQuestions)
        .where(
          and(eq(sessionQuestions.sessionId, sessionId), eq(sessionQuestions.followUpNumber, 0))
        )
        .groupBy(sessionQuestions.topicIdSnapshot),
    ]);
    const used = new Set(usedRows.flatMap(({ questionId }) => (questionId ? [questionId] : [])));
    const coverage = new Map(coverageRows.map(({ topicId, value }) => [topicId, value]));
    const seen = new Set<string>();
    const candidates = candidateRows.flatMap((row): Candidate[] => {
      if (seen.has(row.id) || used.has(row.id) || !['short_answer', 'deep_dive'].includes(row.type))
        return [];
      seen.add(row.id);
      const technologyIds = technologyRows
        .filter(({ questionId }) => questionId === row.id)
        .map(({ technologyId }) => technologyId);
      if (config.topicIds?.length && !config.topicIds.includes(row.topicId)) return [];
      if (
        config.technologyIds?.length &&
        !config.technologyIds.some((id) => technologyIds.includes(id))
      )
        return [];
      return [{ ...row, type: row.type as Candidate['type'], technologyIds }];
    });
    candidates.sort((a, b) => {
      const coverageDelta = (coverage.get(a.topicId) ?? 0) - (coverage.get(b.topicId) ?? 0);
      if (coverageDelta) return coverageDelta;
      const aLevel = a.level === config.level ? 0 : 1;
      const bLevel = b.level === config.level ? 0 : 1;
      return aLevel - bLevel || a.prompt.localeCompare(b.prompt);
    });
    return candidates[0] ?? null;
  }

  async appendQuestion(sessionId: string, candidate: Candidate, now = new Date()) {
    const [sourceRows, positionRow] = await Promise.all([
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
        .where(eq(questionSources.questionId, candidate.id)),
      this.database
        .select({ value: count() })
        .from(sessionQuestions)
        .where(eq(sessionQuestions.sessionId, sessionId)),
    ]);
    const position = positionRow[0]?.value ?? 0;
    const [created] = await this.database
      .insert(sessionQuestions)
      .values({
        sessionId,
        questionId: candidate.id,
        position,
        questionType: candidate.type,
        promptSnapshot: candidate.prompt,
        explanationSnapshot: candidate.explanation,
        topicIdSnapshot: candidate.topicId,
        topicNameSnapshot: candidate.topicName,
        rubricSnapshot: {
          id: candidate.rubricId,
          version: candidate.rubricVersion,
          dimensions: candidate.rubricDimensions,
          referenceAnswer: candidate.referenceAnswer,
        },
        sourceSnapshot: sourceRows,
        askedAt: now,
        createdAt: now,
      })
      .returning({ id: sessionQuestions.id, position: sessionQuestions.position });
    if (!created) throw new Error('Không thể thêm câu hỏi vào interview.');
    return created;
  }

  async appendFollowUp(input: { sessionId: string; parentId: string; prompt: string; now?: Date }) {
    const [parent, positionRow, followUpRow] = await Promise.all([
      this.database
        .select()
        .from(sessionQuestions)
        .where(
          and(
            eq(sessionQuestions.id, input.parentId),
            eq(sessionQuestions.sessionId, input.sessionId)
          )
        )
        .limit(1),
      this.database
        .select({ value: count() })
        .from(sessionQuestions)
        .where(eq(sessionQuestions.sessionId, input.sessionId)),
      this.database
        .select({ value: count() })
        .from(sessionQuestions)
        .where(eq(sessionQuestions.parentSessionQuestionId, input.parentId)),
    ]);
    const source = parent[0];
    if (!source) throw new Error('Câu hỏi gốc không tồn tại.');
    const [created] = await this.database
      .insert(sessionQuestions)
      .values({
        sessionId: input.sessionId,
        questionId: null,
        parentSessionQuestionId: input.parentId,
        followUpNumber: (followUpRow[0]?.value ?? 0) + 1,
        position: positionRow[0]?.value ?? 0,
        questionType: 'deep_dive',
        promptSnapshot: input.prompt.slice(0, 2_000),
        explanationSnapshot: source.explanationSnapshot,
        topicIdSnapshot: source.topicIdSnapshot,
        topicNameSnapshot: source.topicNameSnapshot,
        sourceSnapshot: source.sourceSnapshot,
        rubricSnapshot: source.rubricSnapshot,
        askedAt: input.now ?? new Date(),
        createdAt: input.now ?? new Date(),
      })
      .returning({ id: sessionQuestions.id, position: sessionQuestions.position });
    if (!created) throw new Error('Không thể tạo follow-up.');
    return created;
  }

  async saveDraft(input: {
    userId: string;
    sessionId: string;
    questionId: string;
    answerText: string;
    now?: Date;
  }) {
    const session = await this.getOwnedSession(input.userId, input.sessionId);
    if (!session || !['answering', 'follow_up'].includes(session.state))
      throw new Error('Session không nhận draft lúc này.');
    const [question] = await this.database
      .select({ id: sessionQuestions.id })
      .from(sessionQuestions)
      .where(
        and(
          eq(sessionQuestions.id, input.questionId),
          eq(sessionQuestions.sessionId, input.sessionId),
          eq(sessionQuestions.position, session.currentPosition)
        )
      )
      .limit(1);
    if (!question) throw new Error('Câu hỏi hiện tại không hợp lệ.');
    const savedAt = input.now ?? new Date();
    await this.database
      .insert(answerDrafts)
      .values({
        sessionQuestionId: question.id,
        answerText: input.answerText.slice(0, 30_000),
        savedAt,
      })
      .onConflictDoUpdate({
        target: answerDrafts.sessionQuestionId,
        set: { answerText: input.answerText.slice(0, 30_000), savedAt },
      });
    return savedAt;
  }

  async submitAnswer(input: {
    userId: string;
    sessionId: string;
    questionId: string;
    answerText: string;
    expectedVersion: number;
    now?: Date;
  }) {
    const session = await this.getOwnedSession(input.userId, input.sessionId);
    if (
      !session ||
      !['answering', 'follow_up'].includes(session.state) ||
      session.version !== input.expectedVersion
    )
      throw new StaleInterviewSessionError();
    const answerText = input.answerText.trim();
    if (answerText.length < 20 || answerText.length > 30_000)
      throw new Error('Câu trả lời cần từ 20 đến 30.000 ký tự.');
    const [question] = await this.database
      .select({ id: sessionQuestions.id })
      .from(sessionQuestions)
      .where(
        and(
          eq(sessionQuestions.id, input.questionId),
          eq(sessionQuestions.sessionId, input.sessionId),
          eq(sessionQuestions.position, session.currentPosition)
        )
      )
      .limit(1);
    if (!question) throw new Error('Câu hỏi không khớp turn hiện tại.');
    const nextVersion = await this.transition({
      userId: input.userId,
      sessionId: input.sessionId,
      expectedVersion: input.expectedVersion,
      from: session.state,
      to: 'evaluating',
      now: input.now,
    });
    const [answer] = await this.database
      .insert(answers)
      .values({
        sessionQuestionId: question.id,
        attemptNumber: 1,
        answerText,
        submittedAt: input.now ?? new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: answers.id });
    if (!answer) throw new StaleInterviewSessionError();
    return { answerId: answer.id, version: nextVersion };
  }

  async getEvaluationInput(userId: string, sessionId: string, answerId: string) {
    const [row] = await this.database
      .select({
        answerId: answers.id,
        answer: answers.answerText,
        question: sessionQuestions.promptSnapshot,
        sessionQuestionId: sessionQuestions.id,
        parentSessionQuestionId: sessionQuestions.parentSessionQuestionId,
        rubric: sessionQuestions.rubricSnapshot,
        topicId: sessionQuestions.topicIdSnapshot,
        config: interviewSessions.config,
      })
      .from(answers)
      .innerJoin(sessionQuestions, eq(sessionQuestions.id, answers.sessionQuestionId))
      .innerJoin(interviewSessions, eq(interviewSessions.id, sessionQuestions.sessionId))
      .where(
        and(
          eq(answers.id, answerId),
          eq(interviewSessions.id, sessionId),
          eq(interviewSessions.userId, userId)
        )
      )
      .limit(1);
    if (!row?.answer || !row.rubric) return null;
    return {
      ...row,
      answer: row.answer,
      rubric: row.rubric as {
        id: string;
        version: number;
        dimensions: Array<{ key: string; label: string; description: string; weight: number }>;
        referenceAnswer: string | null;
      },
    };
  }

  async appendEvaluation(input: {
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
  }) {
    const dimensions = Object.fromEntries(
      Object.entries(input.output.dimensions).map(([key, value]) => [key, value.score])
    );
    const feedback = Object.fromEntries(
      Object.entries(input.output.dimensions).map(([key, value]) => [key, value.feedback])
    );
    await this.database.insert(evaluations).values({
      answerId: input.answerId,
      rubricId: input.rubricId,
      model: input.model,
      promptVersion: input.promptVersion,
      score: input.output.score,
      dimensions,
      dimensionFeedback: feedback,
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
    });
  }

  async getRoom(userId: string, sessionId: string) {
    const session = await this.getOwnedSession(userId, sessionId);
    if (!session) return null;
    const questionsRows = await this.database
      .select()
      .from(sessionQuestions)
      .where(eq(sessionQuestions.sessionId, sessionId))
      .orderBy(asc(sessionQuestions.position));
    const ids = questionsRows.map(({ id }) => id);
    const [answerRows, draftRows] = ids.length
      ? await Promise.all([
          this.database
            .select()
            .from(answers)
            .where(inArray(answers.sessionQuestionId, ids))
            .orderBy(asc(answers.submittedAt)),
          this.database
            .select()
            .from(answerDrafts)
            .where(inArray(answerDrafts.sessionQuestionId, ids)),
        ])
      : [[], []];
    const current =
      questionsRows.find(({ position }) => position === session.currentPosition) ?? null;
    return {
      session,
      current,
      draft: current
        ? (draftRows.find(({ sessionQuestionId }) => sessionQuestionId === current.id) ?? null)
        : null,
      turns: questionsRows.map((question) => ({
        ...question,
        answer:
          answerRows.find(({ sessionQuestionId }) => sessionQuestionId === question.id) ?? null,
      })),
      baseQuestionCount: questionsRows.filter(({ followUpNumber }) => followUpNumber === 0).length,
    };
  }

  async getReport(userId: string, sessionId: string) {
    const room = await this.getRoom(userId, sessionId);
    if (!room) return null;
    const answerIds = room.turns.flatMap(({ answer }) => (answer ? [answer.id] : []));
    const evaluationRows = answerIds.length
      ? await this.database
          .select()
          .from(evaluations)
          .where(inArray(evaluations.answerId, answerIds))
          .orderBy(desc(evaluations.createdAt))
      : [];
    const latestByAnswer = new Map<string, (typeof evaluationRows)[number]>();
    for (const evaluation of evaluationRows)
      if (!latestByAnswer.has(evaluation.answerId))
        latestByAnswer.set(evaluation.answerId, evaluation);
    const turns = room.turns.map((turn) => ({
      ...turn,
      evaluation: turn.answer ? (latestByAnswer.get(turn.answer.id) ?? null) : null,
    }));
    return { ...room, turns };
  }
}
