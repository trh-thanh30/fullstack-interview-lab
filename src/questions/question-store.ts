import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNotNull, ne, sql, type SQL } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  questionChoices,
  questionGenerationRuns,
  questionReviewActionValues,
  questionReviewEvents,
  questionSources,
  questionTechnologies,
  questions,
  rubrics,
  sourceChunks,
  sourceChunkTechnologies,
  sources,
  technologies,
  topics,
  users,
} from "@/db/schema";

import type { QuestionWriteInput } from "./question-form";
import type { QuestionGenerationRepository } from "./question-generation";
import { findSimilarQuestions, promptSimilarity } from "./question-review";

export type QuestionReviewAction = (typeof questionReviewActionValues)[number];

export type QuestionFilters = {
  topicId?: string;
  technologyId?: string;
  level?: QuestionWriteInput["level"];
  type?: QuestionWriteInput["type"];
  status?: QuestionWriteInput["status"];
};

export class QuestionStore implements QuestionGenerationRepository {
  constructor(private readonly database: Database) {}

  async list(filters: QuestionFilters = {}) {
    const conditions: SQL[] = [];
    if (filters.topicId) conditions.push(eq(questions.topicId, filters.topicId));
    if (filters.level) conditions.push(eq(questions.level, filters.level));
    if (filters.type) conditions.push(eq(questions.type, filters.type));
    if (filters.status) conditions.push(eq(questions.status, filters.status));
    if (filters.technologyId) {
      conditions.push(
        inArray(
          questions.id,
          this.database
            .select({ questionId: questionTechnologies.questionId })
            .from(questionTechnologies)
            .where(eq(questionTechnologies.technologyId, filters.technologyId)),
        ),
      );
    }

    return this.database
      .select({
        id: questions.id,
        prompt: questions.prompt,
        type: questions.type,
        level: questions.level,
        status: questions.status,
        version: questions.version,
        isManual: questions.isManual,
        topicName: topics.name,
        updatedAt: questions.updatedAt,
      })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(questions.updatedAt));
  }

  async getEditorOptions() {
    const [topicRows, technologyRows, sourceRows] = await Promise.all([
      this.database.select().from(topics).orderBy(asc(topics.position), asc(topics.name)),
      this.database.select().from(technologies).orderBy(asc(technologies.name)),
      this.database
        .select({
          id: sourceChunks.id,
          heading: sourceChunks.heading,
          pageNumber: sourceChunks.pageNumber,
          sourceTitle: sources.title,
        })
        .from(sourceChunks)
        .innerJoin(sources, eq(sourceChunks.sourceId, sources.id))
        .orderBy(asc(sources.title), asc(sourceChunks.position)),
    ]);

    return { topics: topicRows, technologies: technologyRows, sources: sourceRows };
  }

  async findById(id: string) {
    const [question] = await this.database
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1);
    if (!question) return null;

    const [choices, technologyLinks, sourceLinks, rubricRows] = await Promise.all([
      this.database
        .select()
        .from(questionChoices)
        .where(eq(questionChoices.questionId, id))
        .orderBy(asc(questionChoices.position)),
      this.database
        .select({ technologyId: questionTechnologies.technologyId })
        .from(questionTechnologies)
        .where(eq(questionTechnologies.questionId, id)),
      this.database
        .select({ sourceChunkId: questionSources.sourceChunkId })
        .from(questionSources)
        .where(eq(questionSources.questionId, id)),
      this.database
        .select()
        .from(rubrics)
        .where(eq(rubrics.questionId, id))
        .orderBy(desc(rubrics.version))
        .limit(1),
    ]);

    return {
      ...question,
      choices,
      technologyIds: technologyLinks.map(({ technologyId }) => technologyId),
      sourceChunkIds: sourceLinks.map(({ sourceChunkId }) => sourceChunkId),
      rubric: rubricRows[0] ?? null,
    };
  }

  async getGenerationSources(sourceChunkIds: string[]) {
    if (sourceChunkIds.length === 0) return [];

    const [chunkRows, technologyRows] = await Promise.all([
      this.database
        .select({
          id: sourceChunks.id,
          topicId: sourceChunks.topicId,
          sourceTitle: sources.title,
          heading: sourceChunks.heading,
          pageNumber: sourceChunks.pageNumber,
          content: sourceChunks.content,
        })
        .from(sourceChunks)
        .innerJoin(sources, eq(sourceChunks.sourceId, sources.id))
        .where(
          and(
            inArray(sourceChunks.id, sourceChunkIds),
            eq(sources.status, "processed"),
          ),
        ),
      this.database
        .select({
          sourceChunkId: sourceChunkTechnologies.sourceChunkId,
          technologyId: sourceChunkTechnologies.technologyId,
        })
        .from(sourceChunkTechnologies)
        .where(inArray(sourceChunkTechnologies.sourceChunkId, sourceChunkIds)),
    ]);
    const chunksById = new Map(chunkRows.map((chunk) => [chunk.id, chunk]));

    return sourceChunkIds.flatMap((id) => {
      const chunk = chunksById.get(id);
      if (!chunk) return [];
      return [{
        ...chunk,
        technologyIds: technologyRows
          .filter((row) => row.sourceChunkId === id)
          .map((row) => row.technologyId),
      }];
    });
  }

  async listGenerationSourceOptions() {
    return this.database
      .select({
        id: sourceChunks.id,
        heading: sourceChunks.heading,
        pageNumber: sourceChunks.pageNumber,
        excerpt: sql<string>`left(${sourceChunks.content}, 360)`,
        topicName: topics.name,
        sourceTitle: sources.title,
      })
      .from(sourceChunks)
      .innerJoin(sources, eq(sourceChunks.sourceId, sources.id))
      .innerJoin(topics, eq(sourceChunks.topicId, topics.id))
      .where(and(eq(sources.status, "processed"), isNotNull(sourceChunks.topicId)))
      .orderBy(asc(sources.title), asc(sourceChunks.position));
  }

  async listReviewQueue() {
    const queue = await this.database
      .select({
        id: questions.id,
        topicId: questions.topicId,
        topicName: topics.name,
        prompt: questions.prompt,
        explanation: questions.explanation,
        type: questions.type,
        level: questions.level,
        status: questions.status,
        version: questions.version,
        isManual: questions.isManual,
        updatedAt: questions.updatedAt,
        generationModel: questionGenerationRuns.model,
      })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(questionGenerationRuns, eq(questionGenerationRuns.questionId, questions.id))
      .where(inArray(questions.status, ["draft", "reviewed"]))
      .orderBy(asc(questions.createdAt));

    if (!queue.length) return [];
    const ids = queue.map(({ id }) => id);
    const [choiceRows, rubricRows, sourceRows, reviewRows, comparableRows] = await Promise.all([
      this.database
        .select()
        .from(questionChoices)
        .where(inArray(questionChoices.questionId, ids))
        .orderBy(asc(questionChoices.position)),
      this.database
        .select()
        .from(rubrics)
        .where(inArray(rubrics.questionId, ids))
        .orderBy(desc(rubrics.version)),
      this.database
        .select({
          questionId: questionSources.questionId,
          id: sourceChunks.id,
          heading: sourceChunks.heading,
          pageNumber: sourceChunks.pageNumber,
          excerpt: sql<string>`left(${sourceChunks.content}, 2_000)`,
          sourceTitle: sources.title,
          isPrimary: questionSources.isPrimary,
        })
        .from(questionSources)
        .innerJoin(sourceChunks, eq(questionSources.sourceChunkId, sourceChunks.id))
        .innerJoin(sources, eq(sourceChunks.sourceId, sources.id))
        .where(inArray(questionSources.questionId, ids))
        .orderBy(desc(questionSources.isPrimary), asc(sourceChunks.position)),
      this.database
        .select({
          questionId: questionReviewEvents.questionId,
          action: questionReviewEvents.action,
          reason: questionReviewEvents.reason,
          createdAt: questionReviewEvents.createdAt,
          reviewerName: users.name,
          reviewerEmail: users.email,
        })
        .from(questionReviewEvents)
        .innerJoin(users, eq(questionReviewEvents.reviewerUserId, users.id))
        .where(inArray(questionReviewEvents.questionId, ids))
        .orderBy(desc(questionReviewEvents.createdAt)),
      this.database
        .select({
          id: questions.id,
          prompt: questions.prompt,
          topicId: questions.topicId,
          status: questions.status,
        })
        .from(questions)
        .where(ne(questions.status, "archived")),
    ]);

    return queue.map((question) => ({
      ...question,
      choices: choiceRows.filter(({ questionId }) => questionId === question.id),
      rubric: rubricRows.find(({ questionId }) => questionId === question.id) ?? null,
      sources: sourceRows.filter(({ questionId }) => questionId === question.id),
      latestReview: reviewRows.find(({ questionId }) => questionId === question.id) ?? null,
      similarQuestions: findSimilarQuestions(question, comparableRows),
    }));
  }

  async review(input: {
    questionId: string;
    reviewerUserId: string;
    action: QuestionReviewAction;
    reason?: string;
    mergedIntoQuestionId?: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const current = await this.findById(input.questionId);
    if (!current) throw new Error("Question not found.");
    if (current.status !== "draft" && current.status !== "reviewed") {
      throw new Error("Question không còn nằm trong review queue.");
    }

    const submittedReason = input.reason?.trim() || null;
    if (input.action === "reject" && (!submittedReason || submittedReason.length < 5)) {
      throw new Error("Reject cần lý do ít nhất 5 ký tự.");
    }
    const reason = input.action === "reject" ? submittedReason : null;

    let mergedIntoQuestionId: string | null = null;
    if (input.action === "merge") {
      if (!input.mergedIntoQuestionId || input.mergedIntoQuestionId === input.questionId) {
        throw new Error("Hãy chọn một câu hỏi khác để merge.");
      }
      const [target] = await this.database
        .select({ id: questions.id, prompt: questions.prompt, topicId: questions.topicId })
        .from(questions)
        .where(and(
          eq(questions.id, input.mergedIntoQuestionId),
          ne(questions.status, "archived"),
        ))
        .limit(1);
      if (!target) throw new Error("Câu hỏi đích không tồn tại hoặc đã archive.");
      if (target.topicId !== current.topicId || promptSimilarity(current.prompt, target.prompt) < 0.42) {
        throw new Error("Câu hỏi đích không đủ tương đồng để merge.");
      }
      mergedIntoQuestionId = target.id;
    }

    if (input.action === "approve") assertPublishable(current);
    const nextStatus = input.action === "approve"
      ? "published" as const
      : input.action === "mark_outdated"
        ? "outdated" as const
        : "archived" as const;

    await this.database.batch([
      this.database
        .update(questions)
        .set({
          status: nextStatus,
          reviewedByUserId: input.reviewerUserId,
          lastReviewedAt: now,
          updatedAt: now,
        })
        .where(eq(questions.id, input.questionId)),
      this.database.insert(questionReviewEvents).values({
        questionId: input.questionId,
        reviewerUserId: input.reviewerUserId,
        action: input.action,
        previousStatus: current.status,
        newStatus: nextStatus,
        reason,
        mergedIntoQuestionId,
        createdAt: now,
      }),
    ]);
  }

  async create(input: QuestionWriteInput, userId: string, now = new Date()) {
    return this.createWithGeneration(input, userId, now);
  }

  async createGeneratedDraft(
    input: Parameters<QuestionGenerationRepository["createGeneratedDraft"]>[0],
  ) {
    return this.createWithGeneration(
      { ...input.question, status: "draft", isManual: false },
      input.userId,
      new Date(),
      input.generation,
    );
  }

  private async createWithGeneration(
    input: QuestionWriteInput,
    userId: string,
    now: Date,
    generation?: Parameters<QuestionGenerationRepository["createGeneratedDraft"]>[0]["generation"],
  ) {
    const id = randomUUID();
    const statements = this.buildRelatedInsertStatements(id, 1, input, now);

    const generationStatements = generation
      ? [
          this.database.insert(questionGenerationRuns).values({
            questionId: id,
            providerResponseId: generation.providerResponseId,
            model: generation.model,
            promptVersion: generation.promptVersion,
            inputTokens: generation.inputTokens,
            outputTokens: generation.outputTokens,
            createdAt: now,
          }),
        ]
      : [];

    await this.database.batch([
      this.database.insert(questions).values({
        id,
        topicId: input.topicId,
        type: input.type,
        level: input.level,
        status: input.status,
        prompt: input.prompt,
        explanation: input.explanation,
        isManual: input.isManual,
        version: 1,
        createdByUserId: userId,
        reviewedByUserId: input.status === "published" ? userId : null,
        lastReviewedAt: input.status === "published" ? now : null,
        createdAt: now,
        updatedAt: now,
      }),
      ...statements,
      ...generationStatements,
    ]);

    return id;
  }

  async update(id: string, input: QuestionWriteInput, userId: string, now = new Date()) {
    const current = await this.findById(id);
    if (!current) throw new Error("Question not found.");
    const nextVersion = current.version + 1;
    const statements = this.buildRelatedInsertStatements(id, nextVersion, input, now);

    await this.database.batch([
      this.database
        .update(questions)
        .set({
          topicId: input.topicId,
          type: input.type,
          level: input.level,
          status: input.status,
          prompt: input.prompt,
          explanation: input.explanation,
          isManual: input.isManual,
          version: nextVersion,
          reviewedByUserId: input.status === "published" ? userId : current.reviewedByUserId,
          lastReviewedAt: input.status === "published" ? now : current.lastReviewedAt,
          updatedAt: now,
        })
        .where(eq(questions.id, id)),
      this.database.delete(questionChoices).where(eq(questionChoices.questionId, id)),
      this.database
        .delete(questionTechnologies)
        .where(eq(questionTechnologies.questionId, id)),
      this.database.delete(questionSources).where(eq(questionSources.questionId, id)),
      ...statements,
    ]);
  }

  async archive(id: string, now = new Date()) {
    const [question] = await this.database
      .update(questions)
      .set({ status: "archived", updatedAt: now })
      .where(eq(questions.id, id))
      .returning({ id: questions.id });
    if (!question) throw new Error("Question not found.");
  }

  private buildRelatedInsertStatements(
    questionId: string,
    version: number,
    input: QuestionWriteInput,
    now: Date,
  ) {
    const statements = [];

    if (input.choices.length) {
      statements.push(
        this.database.insert(questionChoices).values(
          input.choices.map((choice) => ({ questionId, ...choice })),
        ),
      );
    }
    if (input.technologyIds.length) {
      statements.push(
        this.database.insert(questionTechnologies).values(
          input.technologyIds.map((technologyId) => ({ questionId, technologyId })),
        ),
      );
    }
    if (input.sourceChunkIds.length) {
      statements.push(
        this.database.insert(questionSources).values(
          input.sourceChunkIds.map((sourceChunkId, index) => ({
            questionId,
            sourceChunkId,
            isPrimary: index === 0,
          })),
        ),
      );
    }
    if (input.rubric) {
      statements.push(
        this.database.insert(rubrics).values({
          questionId,
          version,
          dimensions: input.rubric.dimensions,
          referenceAnswer: input.rubric.referenceAnswer,
          createdAt: now,
        }),
      );
    }

    return statements;
  }
}

function assertPublishable(question: NonNullable<Awaited<ReturnType<QuestionStore["findById"]>>>) {
  if (!question.isManual && question.sourceChunkIds.length === 0) {
    throw new Error("Câu hỏi cần source trước khi approve.");
  }
  if (question.type === "mcq") {
    if (question.choices.length < 2 || question.choices.filter(({ isCorrect }) => isCorrect).length !== 1) {
      throw new Error("MCQ cần ít nhất hai lựa chọn và đúng một đáp án đúng.");
    }
  } else if (!question.rubric || question.rubric.dimensions.length < 4) {
    throw new Error("Câu tự luận cần rubric đầy đủ trước khi approve.");
  }
}
