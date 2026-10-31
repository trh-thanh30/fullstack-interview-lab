import { AiCallLogger } from "@/ai/ai-call-log";
import { GeminiStructuredProvider } from "@/ai/gemini-provider";
import { GeminiEmbeddingProvider } from "@/content/embedding-provider";
import type { Database } from "@/db/client";
import { ContextRetriever } from "@/essay/context-retrieval";
import { DrizzleContextRepository } from "@/essay/drizzle-context-repository";
import { ESSAY_EVALUATION_PROMPT_VERSION, evaluateEssay } from "@/essay/evaluator";
import { getRequiredEnv } from "@/lib/env";

import { decideNextInterviewStep } from "./adaptive-decision";
import { MockInterviewStore } from "./mock-interview-store";

export class MockInterviewEngine {
  private readonly store: MockInterviewStore;

  constructor(private readonly database: Database) {
    this.store = new MockInterviewStore(database);
  }

  async start(input: { userId: string; sessionId: string; expectedVersion: number; now?: Date }) {
    const askingVersion = await this.store.transition({
      ...input,
      from: "setup",
      to: "asking",
      startClock: true,
    });
    return this.askNext(input.userId, input.sessionId, askingVersion, input.now);
  }

  async recoverAsking(input: { userId: string; sessionId: string; expectedVersion: number; now?: Date }) {
    return this.askNext(input.userId, input.sessionId, input.expectedVersion, input.now);
  }

  async recoverEvaluating(input: { userId: string; sessionId: string; expectedVersion: number; now?: Date }) {
    const room = await this.store.getRoom(input.userId, input.sessionId);
    if (!room || room.session.state !== "evaluating" || room.session.version !== input.expectedVersion) {
      throw new Error("Session không còn ở bước evaluating.");
    }
    const deadlineReached = Boolean(room.session.deadlineAt && room.session.deadlineAt <= (input.now ?? new Date()));
    if (deadlineReached || room.baseQuestionCount >= (room.session.config.questionCount ?? 5)) {
      await this.store.transition({ ...input, from: "evaluating", to: "summary" });
      return { state: "summary" as const };
    }
    const version = await this.store.transition({ ...input, from: "evaluating", to: "asking" });
    return this.askNext(input.userId, input.sessionId, version, input.now);
  }

  async submit(input: {
    userId: string;
    sessionId: string;
    questionId: string;
    answerText: string;
    expectedVersion: number;
    now?: Date;
  }) {
    const submitted = await this.store.submitAnswer(input);
    const evaluationInput = await this.store.getEvaluationInput(input.userId, input.sessionId, submitted.answerId);
    if (!evaluationInput) throw new Error("Không thể đọc answer vừa lưu.");

    let evaluation: Awaited<ReturnType<typeof evaluateEssay>> | null = null;
    try {
      evaluation = await this.evaluate(evaluationInput);
      await this.store.appendEvaluation({
        answerId: submitted.answerId,
        rubricId: evaluationInput.rubric.id,
        model: evaluation.model,
        promptVersion: ESSAY_EVALUATION_PROMPT_VERSION,
        output: evaluation.output,
        sourceChunkIds: evaluation.sourceChunkIds,
        correlationId: evaluation.correlationId,
        providerResponseId: evaluation.providerResponseId,
        latencyMs: evaluation.latencyMs,
        inputTokens: evaluation.usage.inputTokens,
        outputTokens: evaluation.usage.outputTokens,
      });
    } catch {
      // The answer is durable. Selection below deterministically falls back to the next bank question.
    }

    const room = await this.store.getRoom(input.userId, input.sessionId);
    if (!room) throw new Error("Session không tồn tại.");
    const config = room.session.config;
    const rootId = evaluationInput.parentSessionQuestionId ?? evaluationInput.sessionQuestionId;
    const followUpsUsed = room.turns.filter(({ parentSessionQuestionId }) => parentSessionQuestionId === rootId).length;
    const followUpsAllowed = config.maxFollowUpsPerQuestion ?? 1;
    const deadlineReached = Boolean(room.session.deadlineAt && room.session.deadlineAt <= (input.now ?? new Date()));

    if (evaluation && !deadlineReached && followUpsUsed < followUpsAllowed) {
      const provider = this.provider();
      const decision = await decideNextInterviewStep({
        provider,
        logger: new AiCallLogger(this.database),
        question: evaluationInput.question,
        answer: evaluationInput.answer,
        score: evaluation.output.score,
        missingPoints: evaluation.output.missingPoints,
        suggestedFollowUp: evaluation.output.followUpQuestion,
        remainingFollowUps: followUpsAllowed - followUpsUsed,
      });
      if (decision.action === "follow_up" && decision.followUpQuestion) {
        const followUp = await this.store.appendFollowUp({
          sessionId: input.sessionId,
          parentId: rootId,
          prompt: decision.followUpQuestion,
          now: input.now,
        });
        await this.store.transition({
          userId: input.userId,
          sessionId: input.sessionId,
          expectedVersion: room.session.version,
          from: "evaluating",
          to: "follow_up",
          currentPosition: followUp.position,
          now: input.now,
        });
        return { state: "follow_up" as const };
      }
    }

    if (deadlineReached || room.baseQuestionCount >= (config.questionCount ?? 5)) {
      await this.store.transition({
        userId: input.userId,
        sessionId: input.sessionId,
        expectedVersion: room.session.version,
        from: "evaluating",
        to: "summary",
        now: input.now,
      });
      return { state: "summary" as const };
    }

    const askingVersion = await this.store.transition({
      userId: input.userId,
      sessionId: input.sessionId,
      expectedVersion: room.session.version,
      from: "evaluating",
      to: "asking",
      now: input.now,
    });
    return this.askNext(input.userId, input.sessionId, askingVersion, input.now);
  }

  async abandon(input: { userId: string; sessionId: string; expectedVersion: number; from: "setup" | "asking" | "answering" | "follow_up" | "evaluating"; now?: Date }) {
    await this.store.transition({ ...input, to: "abandoned" });
  }

  private async askNext(userId: string, sessionId: string, expectedVersion: number, now?: Date) {
    const candidate = await this.store.chooseNextQuestion(userId, sessionId);
    if (!candidate) {
      await this.store.transition({ userId, sessionId, expectedVersion, from: "asking", to: "summary", now });
      return { state: "summary" as const };
    }
    const question = await this.store.appendQuestion(sessionId, candidate, now);
    await this.store.transition({
      userId,
      sessionId,
      expectedVersion,
      from: "asking",
      to: "answering",
      currentPosition: question.position,
      now,
    });
    return { state: "answering" as const };
  }

  private async evaluate(input: NonNullable<Awaited<ReturnType<MockInterviewStore["getEvaluationInput"]>>>) {
    const apiKey = getRequiredEnv("GOOGLE_GENERATIVE_AI_API_KEY");
    const provider = this.provider(apiKey);
    const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-2";
    const retriever = new ContextRetriever(
      new DrizzleContextRepository(this.database),
      new GeminiEmbeddingProvider(apiKey, embeddingModel),
      {
        topK: readNumber("AI_RETRIEVAL_TOP_K", 5),
        similarityThreshold: readNumber("AI_RETRIEVAL_SIMILARITY_THRESHOLD", 0.68),
      },
    );
    return evaluateEssay({
      provider,
      retriever,
      logger: new AiCallLogger(this.database),
      question: input.question,
      answer: input.answer,
      rubric: input.rubric,
      topicId: input.topicId,
      technologyIds: input.config.technologyIds ?? [],
    });
  }

  private provider(apiKey = getRequiredEnv("GOOGLE_GENERATIVE_AI_API_KEY")) {
    return new GeminiStructuredProvider(
      apiKey,
      process.env.GEMINI_EVALUATION_MODEL?.trim() || "gemini-2.5-flash",
    );
  }
}

function readNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}
