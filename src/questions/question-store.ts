import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  questionChoices,
  questionGenerationRuns,
  questionSources,
  questionTechnologies,
  questions,
  rubrics,
  sourceChunks,
  sourceChunkTechnologies,
  sources,
  technologies,
  topics,
} from "@/db/schema";

import type { QuestionWriteInput } from "./question-form";
import type { QuestionGenerationRepository } from "./question-generation";

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
