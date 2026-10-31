import { randomUUID } from "node:crypto";

import { and, asc, count, desc, eq, inArray, type SQL } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  answers,
  interviewSessions,
  questionChoices,
  questionSources,
  questionTechnologies,
  questions,
  sessionQuestions,
  sourceChunks,
  sources,
  technologies,
  topics,
} from "@/db/schema";

import type { PracticeConfiguration } from "./practice-config";

export class PracticeStore {
  constructor(private readonly database: Database) {}

  async getConfigurationOptions() {
    const [topicRows, technologyRows] = await Promise.all([
      this.database.select({ id: topics.id, name: topics.name }).from(topics).orderBy(asc(topics.position)),
      this.database
        .select({ id: technologies.id, name: technologies.name, topicId: technologies.primaryTopicId })
        .from(technologies)
        .orderBy(asc(technologies.name)),
    ]);
    return { topics: topicRows, technologies: technologyRows };
  }

  async countAvailable(configuration: PracticeConfiguration) {
    const [row] = await this.database
      .select({ value: count() })
      .from(questions)
      .where(and(...questionConditions(configuration, this.database)));
    return row?.value ?? 0;
  }

  async listRecentSessions(userId: string) {
    const rows = await this.database
      .select({
        id: interviewSessions.id,
        state: interviewSessions.state,
        currentPosition: interviewSessions.currentPosition,
        startedAt: interviewSessions.startedAt,
        completedAt: interviewSessions.completedAt,
        createdAt: interviewSessions.createdAt,
      })
      .from(interviewSessions)
      .where(and(eq(interviewSessions.userId, userId), eq(interviewSessions.mode, "mcq")))
      .orderBy(desc(interviewSessions.createdAt))
      .limit(6);

    if (!rows.length) return [];
    const totals = await this.database
      .select({ sessionId: sessionQuestions.sessionId, value: count() })
      .from(sessionQuestions)
      .where(inArray(sessionQuestions.sessionId, rows.map(({ id }) => id)))
      .groupBy(sessionQuestions.sessionId);
    const totalBySession = new Map(totals.map((item) => [item.sessionId, item.value]));
    return rows.map((row) => ({ ...row, questionCount: totalBySession.get(row.id) ?? 0 }));
  }

  async createSession(input: {
    userId: string;
    configuration: PracticeConfiguration;
    questionIds?: string[];
    retryOfSessionId?: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const candidates = await this.getCandidates(input.configuration, input.questionIds);
    if (!candidates.length) throw new Error("Không có câu hỏi published phù hợp với cấu hình này.");

    const requestedCount = input.questionIds?.length ?? input.configuration.questionCount;
    if (candidates.length < requestedCount) {
      throw new Error(`Chỉ có ${candidates.length} câu hỏi hợp lệ, ít hơn ${requestedCount} câu đã chọn.`);
    }

    const ordered = input.configuration.strategy === "weak_first" && !input.questionIds
      ? await this.prioritizeWeakQuestions(input.userId, candidates)
      : shuffle(candidates);
    const selected = ordered.slice(0, requestedCount);
    const questionIds = selected.map(({ id }) => id);
    const [choiceRows, sourceRows] = await Promise.all([
      this.database
        .select({
          id: questionChoices.id,
          questionId: questionChoices.questionId,
          content: questionChoices.content,
          position: questionChoices.position,
          isCorrect: questionChoices.isCorrect,
        })
        .from(questionChoices)
        .where(inArray(questionChoices.questionId, questionIds))
        .orderBy(asc(questionChoices.position)),
      this.database
        .select({
          questionId: questionSources.questionId,
          id: sourceChunks.id,
          sourceTitle: sources.title,
          heading: sourceChunks.heading,
          pageNumber: sourceChunks.pageNumber,
        })
        .from(questionSources)
        .innerJoin(sourceChunks, eq(questionSources.sourceChunkId, sourceChunks.id))
        .innerJoin(sources, eq(sourceChunks.sourceId, sources.id))
        .where(inArray(questionSources.questionId, questionIds)),
    ]);

    const snapshots = selected.map((question, position) => {
      const choices = choiceRows.filter((choice) => choice.questionId === question.id);
      const answerKey = choices.filter(({ isCorrect }) => isCorrect).map(({ id }) => id);
      if (choices.length < 2 || answerKey.length !== 1) {
        throw new Error(`Question ${question.id} không có answer key MCQ hợp lệ.`);
      }
      return {
        id: randomUUID(),
        question,
        position,
        choices: shuffle(choices.map(({ id, content, position: choicePosition }) => ({
          id,
          content,
          position: choicePosition,
        }))),
        answerKey,
        sources: sourceRows
          .filter((source) => source.questionId === question.id)
          .map((source) => ({
            id: source.id,
            sourceTitle: source.sourceTitle,
            heading: source.heading,
            pageNumber: source.pageNumber,
          })),
      };
    });

    const sessionId = randomUUID();
    await this.database.batch([
      this.database.insert(interviewSessions).values({
        id: sessionId,
        userId: input.userId,
        mode: "mcq",
        state: "asking",
        config: {
          topicIds: input.configuration.topicId ? [input.configuration.topicId] : [],
          technologyIds: input.configuration.technologyIds,
          level: input.configuration.level,
          questionCount: selected.length,
          strategy: input.configuration.strategy,
          retryOfSessionId: input.retryOfSessionId,
        },
        currentPosition: 0,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
      this.database.insert(sessionQuestions).values(snapshots.map((snapshot) => ({
        id: snapshot.id,
        sessionId,
        questionId: snapshot.question.id,
        position: snapshot.position,
        questionType: "mcq" as const,
        promptSnapshot: snapshot.question.prompt,
        explanationSnapshot: snapshot.question.explanation,
        topicIdSnapshot: snapshot.question.topicId,
        topicNameSnapshot: snapshot.question.topicName,
        choicesSnapshot: snapshot.choices,
        answerKeySnapshot: snapshot.answerKey,
        sourceSnapshot: snapshot.sources,
        askedAt: snapshot.position === 0 ? now : null,
        createdAt: now,
      }))),
    ]);

    return sessionId;
  }

  async getSessionForPlay(userId: string, sessionId: string) {
    const session = await this.getOwnedSession(userId, sessionId);
    if (!session) return null;
    const [totalRow] = await this.database
      .select({ value: count() })
      .from(sessionQuestions)
      .where(eq(sessionQuestions.sessionId, sessionId));
    const total = totalRow?.value ?? 0;

    if (session.state === "completed") {
      return { id: session.id, state: "completed" as const, currentPosition: session.currentPosition, total };
    }

    const [question] = await this.database
      .select()
      .from(sessionQuestions)
      .where(and(
        eq(sessionQuestions.sessionId, sessionId),
        eq(sessionQuestions.position, session.currentPosition),
      ))
      .limit(1);
    if (!question) throw new Error("Session không có câu hỏi tại vị trí hiện tại.");

    const [answer] = await this.database
      .select({
        selectedChoiceIds: answers.selectedChoiceIds,
        isCorrect: answers.isCorrect,
        submittedAt: answers.submittedAt,
      })
      .from(answers)
      .where(and(eq(answers.sessionQuestionId, question.id), eq(answers.attemptNumber, 1)))
      .limit(1);

    return {
      id: session.id,
      state: "asking" as const,
      currentPosition: session.currentPosition,
      total,
      startedAt: session.startedAt,
      question: {
        id: question.id,
        prompt: question.promptSnapshot,
        choices: question.choicesSnapshot,
        topicName: question.topicNameSnapshot,
      },
      answer: answer
        ? {
            ...answer,
            correctChoiceIds: question.answerKeySnapshot,
            explanation: question.explanationSnapshot,
            sources: question.sourceSnapshot,
          }
        : null,
    };
  }

  async submitAnswer(input: {
    userId: string;
    sessionId: string;
    sessionQuestionId: string;
    selectedChoiceId: string;
    now?: Date;
  }) {
    const session = await this.getOwnedSession(input.userId, input.sessionId);
    if (!session || session.state !== "asking") throw new Error("Session không còn nhận câu trả lời.");

    const [question] = await this.database
      .select()
      .from(sessionQuestions)
      .where(and(
        eq(sessionQuestions.id, input.sessionQuestionId),
        eq(sessionQuestions.sessionId, input.sessionId),
        eq(sessionQuestions.position, session.currentPosition),
      ))
      .limit(1);
    if (!question) throw new Error("Câu hỏi không khớp với vị trí hiện tại.");
    if (!question.choicesSnapshot.some(({ id }) => id === input.selectedChoiceId)) {
      throw new Error("Lựa chọn không thuộc câu hỏi hiện tại.");
    }

    const [existing] = await this.database
      .select({ id: answers.id })
      .from(answers)
      .where(and(eq(answers.sessionQuestionId, question.id), eq(answers.attemptNumber, 1)))
      .limit(1);
    if (existing) throw new Error("Câu hỏi này đã được trả lời.");

    const isCorrect = question.answerKeySnapshot.includes(input.selectedChoiceId);
    const inserted = await this.database
      .insert(answers)
      .values({
        sessionQuestionId: question.id,
        attemptNumber: 1,
        selectedChoiceIds: [input.selectedChoiceId],
        isCorrect,
        submittedAt: input.now ?? new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: answers.id });
    if (!inserted.length) throw new Error("Câu hỏi này đã được trả lời.");
    return isCorrect;
  }

  async advance(input: {
    userId: string;
    sessionId: string;
    sessionQuestionId: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const session = await this.getOwnedSession(input.userId, input.sessionId);
    if (!session || session.state !== "asking") throw new Error("Session không thể chuyển câu.");

    const [current] = await this.database
      .select({ id: sessionQuestions.id })
      .from(sessionQuestions)
      .innerJoin(answers, and(
        eq(answers.sessionQuestionId, sessionQuestions.id),
        eq(answers.attemptNumber, 1),
      ))
      .where(and(
        eq(sessionQuestions.id, input.sessionQuestionId),
        eq(sessionQuestions.sessionId, input.sessionId),
        eq(sessionQuestions.position, session.currentPosition),
      ))
      .limit(1);
    if (!current) throw new Error("Hãy submit đáp án trước khi chuyển câu.");

    const [totalRow] = await this.database
      .select({ value: count() })
      .from(sessionQuestions)
      .where(eq(sessionQuestions.sessionId, input.sessionId));
    const total = totalRow?.value ?? 0;
    const isComplete = session.currentPosition >= total - 1;

    if (isComplete) {
      await this.database
        .update(interviewSessions)
        .set({ state: "completed", completedAt: now, updatedAt: now })
        .where(and(
          eq(interviewSessions.id, input.sessionId),
          eq(interviewSessions.userId, input.userId),
          eq(interviewSessions.currentPosition, session.currentPosition),
        ));
      return { completed: true };
    }

    const nextPosition = session.currentPosition + 1;
    await this.database.batch([
      this.database
        .update(interviewSessions)
        .set({ currentPosition: nextPosition, updatedAt: now })
        .where(and(
          eq(interviewSessions.id, input.sessionId),
          eq(interviewSessions.userId, input.userId),
          eq(interviewSessions.currentPosition, session.currentPosition),
        )),
      this.database
        .update(sessionQuestions)
        .set({ askedAt: now })
        .where(and(
          eq(sessionQuestions.sessionId, input.sessionId),
          eq(sessionQuestions.position, nextPosition),
        )),
    ]);
    return { completed: false };
  }

  async getResult(userId: string, sessionId: string) {
    const session = await this.getOwnedSession(userId, sessionId);
    if (!session) return null;
    if (session.state !== "completed") return { state: session.state as "asking" };

    const rows = await this.database
      .select({
        id: sessionQuestions.id,
        questionId: sessionQuestions.questionId,
        position: sessionQuestions.position,
        prompt: sessionQuestions.promptSnapshot,
        explanation: sessionQuestions.explanationSnapshot,
        topicName: sessionQuestions.topicNameSnapshot,
        sources: sessionQuestions.sourceSnapshot,
        selectedChoiceIds: answers.selectedChoiceIds,
        isCorrect: answers.isCorrect,
      })
      .from(sessionQuestions)
      .innerJoin(answers, and(
        eq(answers.sessionQuestionId, sessionQuestions.id),
        eq(answers.attemptNumber, 1),
      ))
      .where(eq(sessionQuestions.sessionId, sessionId))
      .orderBy(asc(sessionQuestions.position));

    const correct = rows.filter(({ isCorrect }) => isCorrect).length;
    const byTopic = new Map<string, { topicName: string; correct: number; total: number }>();
    for (const row of rows) {
      const topic = byTopic.get(row.topicName) ?? { topicName: row.topicName, correct: 0, total: 0 };
      topic.total += 1;
      if (row.isCorrect) topic.correct += 1;
      byTopic.set(row.topicName, topic);
    }

    return {
      state: "completed" as const,
      id: session.id,
      total: rows.length,
      correct,
      durationMs: session.startedAt && session.completedAt
        ? Math.max(0, session.completedAt.getTime() - session.startedAt.getTime())
        : 0,
      topics: [...byTopic.values()],
      wrong: rows.filter(({ isCorrect }) => !isCorrect),
      completedAt: session.completedAt,
    };
  }

  async createRetrySession(userId: string, sessionId: string) {
    const result = await this.getResult(userId, sessionId);
    if (!result || result.state !== "completed") throw new Error("Kết quả session chưa sẵn sàng.");
    const questionIds = result.wrong.flatMap(({ questionId }) => questionId ? [questionId] : []);
    if (!questionIds.length) throw new Error("Session này không có câu sai để luyện lại.");

    return this.createSession({
      userId,
      questionIds,
      retryOfSessionId: sessionId,
      configuration: {
        topicId: undefined,
        technologyIds: [],
        level: undefined,
        questionCount: questionIds.length,
        strategy: "random",
      },
    });
  }

  private async getCandidates(configuration: PracticeConfiguration, explicitQuestionIds?: string[]) {
    const conditions = questionConditions(configuration, this.database);
    if (explicitQuestionIds) conditions.push(inArray(questions.id, explicitQuestionIds));
    return this.database
      .select({
        id: questions.id,
        topicId: questions.topicId,
        topicName: topics.name,
        prompt: questions.prompt,
        explanation: questions.explanation,
      })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(and(...conditions));
  }

  private async prioritizeWeakQuestions<T extends { id: string }>(userId: string, candidates: T[]) {
    const history = await this.database
      .select({ questionId: sessionQuestions.questionId, isCorrect: answers.isCorrect })
      .from(sessionQuestions)
      .innerJoin(interviewSessions, eq(sessionQuestions.sessionId, interviewSessions.id))
      .innerJoin(answers, eq(answers.sessionQuestionId, sessionQuestions.id))
      .where(and(
        eq(interviewSessions.userId, userId),
        inArray(sessionQuestions.questionId, candidates.map(({ id }) => id)),
      ));
    const attempted = new Set(history.flatMap(({ questionId }) => questionId ? [questionId] : []));
    const incorrect = new Set(history.flatMap(({ questionId, isCorrect }) => questionId && !isCorrect ? [questionId] : []));

    return shuffle(candidates).sort((left, right) => {
      const score = (id: string) => incorrect.has(id) ? 0 : attempted.has(id) ? 2 : 1;
      return score(left.id) - score(right.id);
    });
  }

  private async getOwnedSession(userId: string, sessionId: string) {
    const [session] = await this.database
      .select()
      .from(interviewSessions)
      .where(and(
        eq(interviewSessions.id, sessionId),
        eq(interviewSessions.userId, userId),
        eq(interviewSessions.mode, "mcq"),
      ))
      .limit(1);
    return session ?? null;
  }
}

function questionConditions(configuration: PracticeConfiguration, database: Database) {
  const conditions: SQL[] = [eq(questions.status, "published"), eq(questions.type, "mcq")];
  if (configuration.topicId) conditions.push(eq(questions.topicId, configuration.topicId));
  if (configuration.level) conditions.push(eq(questions.level, configuration.level));
  if (configuration.technologyIds.length) {
    conditions.push(inArray(
      questions.id,
      database
        .select({ questionId: questionTechnologies.questionId })
        .from(questionTechnologies)
        .where(inArray(questionTechnologies.technologyId, configuration.technologyIds)),
    ));
  }
  return conditions;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
}
