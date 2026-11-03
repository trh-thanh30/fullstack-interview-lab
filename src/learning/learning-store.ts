import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
} from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  answers,
  codingDrafts,
  codingReviews,
  evaluations,
  interviewSessions,
  questions,
  questionTechnologies,
  reviewSchedules,
  sessionQuestions,
  systemDesignCheckpointResponses,
  systemDesignReviews,
  technologies,
  topics,
} from "@/db/schema";

import { rankWeakTopics, type TopicEvidence } from "./recommendations";
import {
  normalizeConfidence,
  updateReviewSchedule,
  type ReviewConfidence,
} from "./spaced-repetition";

export const learningRangeValues = ["7d", "30d", "90d", "all"] as const;
export type LearningRange = (typeof learningRangeValues)[number];

const completedStates = ["completed", "summary"] as const;

export class LearningStore {
  constructor(private readonly database: Database) {}

  async getDashboard(userId: string, range: LearningRange, now = new Date()) {
    const since = rangeStart(range, now);
    const sessionWhere = and(
      eq(interviewSessions.userId, userId),
      inArray(interviewSessions.state, completedStates),
      ...(since ? [gte(interviewSessions.completedAt, since)] : []),
    );
    const activityWhere = and(
      eq(interviewSessions.userId, userId),
      inArray(interviewSessions.state, completedStates),
      ...(since ? [gte(answers.submittedAt, since)] : []),
    );

    const [sessions, answerRows, evaluationRows, technologyRows, systemRows, codingRows] =
      await Promise.all([
        this.database
          .select({
            id: interviewSessions.id,
            mode: interviewSessions.mode,
            startedAt: interviewSessions.startedAt,
            completedAt: interviewSessions.completedAt,
          })
          .from(interviewSessions)
          .where(sessionWhere),
        this.database
          .select({
            topicId: sessionQuestions.topicIdSnapshot,
            topicName: sessionQuestions.topicNameSnapshot,
            level: questions.level,
            isCorrect: answers.isCorrect,
            submittedAt: answers.submittedAt,
          })
          .from(answers)
          .innerJoin(sessionQuestions, eq(sessionQuestions.id, answers.sessionQuestionId))
          .innerJoin(interviewSessions, eq(interviewSessions.id, sessionQuestions.sessionId))
          .leftJoin(questions, eq(questions.id, sessionQuestions.questionId))
          .where(activityWhere),
        this.database
          .select({
            mode: interviewSessions.mode,
            topicId: sessionQuestions.topicIdSnapshot,
            topicName: sessionQuestions.topicNameSnapshot,
            level: questions.level,
            score: evaluations.score,
            dimensions: evaluations.dimensions,
            createdAt: evaluations.createdAt,
          })
          .from(evaluations)
          .innerJoin(answers, eq(answers.id, evaluations.answerId))
          .innerJoin(sessionQuestions, eq(sessionQuestions.id, answers.sessionQuestionId))
          .innerJoin(interviewSessions, eq(interviewSessions.id, sessionQuestions.sessionId))
          .leftJoin(questions, eq(questions.id, sessionQuestions.questionId))
          .where(
            and(
              eq(interviewSessions.userId, userId),
              inArray(interviewSessions.state, completedStates),
              ...(since ? [gte(evaluations.createdAt, since)] : []),
            ),
          )
          .orderBy(asc(evaluations.createdAt)),
        this.database
          .select({
            name: technologies.name,
            isCorrect: answers.isCorrect,
            score: evaluations.score,
          })
          .from(questionTechnologies)
          .innerJoin(technologies, eq(technologies.id, questionTechnologies.technologyId))
          .innerJoin(sessionQuestions, eq(sessionQuestions.questionId, questionTechnologies.questionId))
          .innerJoin(interviewSessions, eq(interviewSessions.id, sessionQuestions.sessionId))
          .innerJoin(answers, eq(answers.sessionQuestionId, sessionQuestions.id))
          .leftJoin(evaluations, eq(evaluations.answerId, answers.id))
          .where(activityWhere),
        this.database
          .select({
            score: systemDesignReviews.score,
            dimensions: systemDesignReviews.dimensionScores,
            createdAt: systemDesignReviews.createdAt,
          })
          .from(systemDesignReviews)
          .innerJoin(
            systemDesignCheckpointResponses,
            eq(systemDesignCheckpointResponses.id, systemDesignReviews.responseId),
          )
          .innerJoin(
            interviewSessions,
            eq(interviewSessions.id, systemDesignCheckpointResponses.sessionId),
          )
          .where(
            and(
              eq(interviewSessions.userId, userId),
              inArray(interviewSessions.state, completedStates),
              ...(since ? [gte(systemDesignReviews.createdAt, since)] : []),
            ),
          ),
        this.database
          .select({ score: codingReviews.score, createdAt: codingReviews.createdAt })
          .from(codingReviews)
          .innerJoin(codingDrafts, eq(codingDrafts.id, codingReviews.draftId))
          .innerJoin(interviewSessions, eq(interviewSessions.id, codingDrafts.sessionId))
          .where(
            and(
              eq(interviewSessions.userId, userId),
              ...(since ? [gte(codingReviews.createdAt, since)] : []),
            ),
          ),
      ]);

    const mcqAnswers = answerRows.filter(({ isCorrect }) => isCorrect !== null);
    const totalMinutes = Math.round(
      sessions.reduce((total, session) => {
        if (!session.startedAt || !session.completedAt) return total;
        return total + Math.max(0, session.completedAt.getTime() - session.startedAt.getTime());
      }, 0) / 60_000,
    );
    const accuracy = mcqAnswers.length
      ? Math.round(
          (mcqAnswers.filter(({ isCorrect }) => isCorrect).length / mcqAnswers.length) * 100,
        )
      : null;

    const breakdown = groupPerformance([
      ...answerRows.map((row) => ({
        key: row.topicName,
        score: row.isCorrect === null ? null : row.isCorrect ? 100 : 0,
      })),
      ...evaluationRows.map((row) => ({ key: row.topicName, score: row.score })),
    ]);
    const levels = groupPerformance([
      ...answerRows.flatMap((row) =>
        row.level
          ? [{ key: row.level, score: row.isCorrect === null ? null : row.isCorrect ? 100 : 0 }]
          : [],
      ),
      ...evaluationRows.flatMap((row) =>
        row.level ? [{ key: row.level, score: row.score }] : [],
      ),
    ]);
    const technologyBreakdown = groupPerformance(
      technologyRows.map((row) => ({
        key: row.name,
        score: row.score ?? (row.isCorrect === null ? null : row.isCorrect ? 100 : 0),
      })),
    );
    const dimensionBreakdown = groupDimensions([
      ...evaluationRows.map(({ dimensions }) => dimensions),
      ...systemRows.map(({ dimensions }) => dimensions),
    ]);
    const trends = [
      ...evaluationRows
        .filter(({ mode }) => mode === "short_answer" || mode === "mock_interview")
        .map((row) => ({ date: row.createdAt, mode: row.mode, score: row.score })),
      ...systemRows.map((row) => ({ date: row.createdAt, mode: "system_design", score: row.score })),
      ...codingRows.map((row) => ({ date: row.createdAt, mode: "coding", score: row.score })),
    ].sort((left, right) => left.date.getTime() - right.date.getTime());

    return {
      summary: { sessions: sessions.length, totalMinutes, accuracy, answers: answerRows.length },
      breakdown,
      levels,
      technologies: technologyBreakdown,
      dimensions: dimensionBreakdown,
      trends,
    };
  }

  async getRecommendations(userId: string, now = new Date()) {
    const [topicRows, answerRows, evaluationRows, availableRows] = await Promise.all([
      this.database.select({ id: topics.id, name: topics.name }).from(topics).orderBy(asc(topics.position)),
      this.database
        .select({
          topicId: sessionQuestions.topicIdSnapshot,
          isCorrect: answers.isCorrect,
          at: answers.submittedAt,
        })
        .from(answers)
        .innerJoin(sessionQuestions, eq(sessionQuestions.id, answers.sessionQuestionId))
        .innerJoin(interviewSessions, eq(interviewSessions.id, sessionQuestions.sessionId))
        .where(
          and(
            eq(interviewSessions.userId, userId),
            inArray(interviewSessions.state, completedStates),
          ),
        ),
      this.database
        .select({
          topicId: sessionQuestions.topicIdSnapshot,
          score: evaluations.score,
          dimensions: evaluations.dimensions,
          at: evaluations.createdAt,
        })
        .from(evaluations)
        .innerJoin(answers, eq(answers.id, evaluations.answerId))
        .innerJoin(sessionQuestions, eq(sessionQuestions.id, answers.sessionQuestionId))
        .innerJoin(interviewSessions, eq(interviewSessions.id, sessionQuestions.sessionId))
        .where(
          and(
            eq(interviewSessions.userId, userId),
            inArray(interviewSessions.state, completedStates),
          ),
        ),
      this.database
        .select({ topicId: questions.topicId })
        .from(questions)
        .where(and(eq(questions.status, "published"), eq(questions.type, "mcq"))),
    ]);

    const evidence: TopicEvidence[] = topicRows.map((topic) => {
      const topicAnswers = answerRows.filter((row) => row.topicId === topic.id);
      const topicEvaluations = evaluationRows.filter((row) => row.topicId === topic.id);
      const activity = [
        ...topicAnswers.map(({ at }) => at),
        ...topicEvaluations.map(({ at }) => at),
      ];
      return {
        topicId: topic.id,
        topicName: topic.name,
        attempts: topicAnswers.filter(({ isCorrect }) => isCorrect !== null).length,
        correct: topicAnswers.filter(({ isCorrect }) => isCorrect).length,
        scoreSamples: topicEvaluations.map(({ score }) => score),
        dimensionSamples: topicEvaluations.flatMap(({ dimensions }) => Object.values(dimensions)),
        lastPracticedAt: activity.length
          ? new Date(Math.max(...activity.map((date) => date.getTime())))
          : null,
      };
    });
    const availableByTopic = new Map<string, number>();
    for (const { topicId } of availableRows) {
      availableByTopic.set(topicId, (availableByTopic.get(topicId) ?? 0) + 1);
    }
    return rankWeakTopics(evidence, now).map((item) => ({
      ...item,
      availableQuestions: availableByTopic.get(item.topicId) ?? 0,
    }));
  }

  async recordReview(input: {
    userId: string;
    questionId: string;
    correct: boolean;
    confidence?: ReviewConfidence;
    reviewedAt?: Date;
  }) {
    const prepared = await this.prepareReview(input);
    await prepared.statement;
    return prepared.next;
  }

  async prepareReview(input: {
    userId: string;
    questionId: string;
    correct: boolean;
    confidence?: ReviewConfidence;
    reviewedAt?: Date;
  }) {
    const reviewedAt = input.reviewedAt ?? new Date();
    const [current] = await this.database
      .select()
      .from(reviewSchedules)
      .where(
        and(
          eq(reviewSchedules.userId, input.userId),
          eq(reviewSchedules.questionId, input.questionId),
        ),
      )
      .limit(1);
    const confidence = normalizeConfidence(input.confidence);
    const next = updateReviewSchedule({ current, correct: input.correct, confidence, reviewedAt });
    const statement = this.database
      .insert(reviewSchedules)
      .values({
        userId: input.userId,
        questionId: input.questionId,
        ease: next.ease,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        dueAt: next.dueAt,
        lastReviewedAt: reviewedAt,
        lastResult: input.correct ? "correct" : "incorrect",
        lastConfidence: confidence,
        createdAt: reviewedAt,
        updatedAt: reviewedAt,
      })
      .onConflictDoUpdate({
        target: [reviewSchedules.userId, reviewSchedules.questionId],
        set: {
          ease: next.ease,
          intervalDays: next.intervalDays,
          repetitions: next.repetitions,
          dueAt: next.dueAt,
          lastReviewedAt: reviewedAt,
          lastResult: input.correct ? "correct" : "incorrect",
          lastConfidence: confidence,
          updatedAt: reviewedAt,
        },
      });
    return { statement, next };
  }

  async getDailyQueue(userId: string, limit = 10, now = new Date()) {
    const due = await this.database
      .select({
        questionId: questions.id,
        prompt: questions.prompt,
        topicName: topics.name,
        dueAt: reviewSchedules.dueAt,
        lastResult: reviewSchedules.lastResult,
        repetitions: reviewSchedules.repetitions,
      })
      .from(reviewSchedules)
      .innerJoin(questions, eq(questions.id, reviewSchedules.questionId))
      .innerJoin(topics, eq(topics.id, questions.topicId))
      .where(
        and(
          eq(reviewSchedules.userId, userId),
          lte(reviewSchedules.dueAt, now),
          eq(questions.status, "published"),
          eq(questions.type, "mcq"),
        ),
      )
      .orderBy(asc(reviewSchedules.dueAt))
      .limit(limit);

    const remaining = Math.max(0, limit - due.length);
    const fresh = remaining
      ? await this.database
          .select({
            questionId: questions.id,
            prompt: questions.prompt,
            topicName: topics.name,
          })
          .from(questions)
          .innerJoin(topics, eq(topics.id, questions.topicId))
          .leftJoin(
            reviewSchedules,
            and(
              eq(reviewSchedules.questionId, questions.id),
              eq(reviewSchedules.userId, userId),
            ),
          )
          .where(
            and(
              eq(questions.status, "published"),
              eq(questions.type, "mcq"),
              isNull(reviewSchedules.id),
            ),
          )
          .orderBy(asc(questions.createdAt))
          .limit(remaining)
      : [];

    return [
      ...due.map((item) => ({ ...item, kind: "due" as const })),
      ...fresh.map((item) => ({
        ...item,
        dueAt: null,
        lastResult: null,
        repetitions: 0,
        kind: "new" as const,
      })),
    ];
  }

  async resetSchedule(userId: string, questionId: string) {
    await this.database
      .delete(reviewSchedules)
      .where(
        and(eq(reviewSchedules.userId, userId), eq(reviewSchedules.questionId, questionId)),
      );
  }
}

function rangeStart(range: LearningRange, now: Date) {
  if (range === "all") return null;
  const days = Number.parseInt(range, 10);
  return new Date(now.getTime() - days * 86_400_000);
}

function groupPerformance(rows: Array<{ key: string; score: number | null }>) {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    if (row.score === null) continue;
    const values = groups.get(row.key) ?? [];
    values.push(row.score);
    groups.set(row.key, values);
  }
  return [...groups]
    .map(([name, values]) => ({ name, score: Math.round(average(values)), samples: values.length }))
    .sort((left, right) => left.score - right.score || left.name.localeCompare(right.name));
}

function groupDimensions(rows: Array<Record<string, number>>) {
  const groups = new Map<string, number[]>();
  for (const dimensions of rows) {
    for (const [key, score] of Object.entries(dimensions)) {
      const values = groups.get(key) ?? [];
      values.push(score);
      groups.set(key, values);
    }
  }
  return [...groups]
    .map(([name, values]) => ({ name, score: Math.round(average(values)), samples: values.length }))
    .sort((left, right) => left.score - right.score || left.name.localeCompare(right.name));
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
