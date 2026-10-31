import { AiCallLogger } from "@/ai/ai-call-log";
import { GeminiStructuredProvider } from "@/ai/gemini-provider";
import { GeminiEmbeddingProvider } from "@/content/embedding-provider";
import { getDatabase } from "@/db/client";
import { getRequiredEnv } from "@/lib/env";

import { ContextRetriever } from "./context-retrieval";
import { DrizzleContextRepository } from "./drizzle-context-repository";
import { ESSAY_EVALUATION_PROMPT_VERSION, evaluateEssay } from "./evaluator";
import { EssayStore } from "./essay-store";

export async function evaluateAndPersistEssay(input: {
  userId: string;
  sessionId: string;
  answerId: string;
}) {
  const database = getDatabase();
  const store = new EssayStore(database);
  const evaluationInput = await store.getEvaluationInput(input.userId, input.sessionId, input.answerId);
  if (!evaluationInput) throw new Error("Answer attempt không tồn tại.");

  const apiKey = getRequiredEnv("GOOGLE_GENERATIVE_AI_API_KEY");
  const model = process.env.GEMINI_EVALUATION_MODEL?.trim() || "gemini-2.5-flash";
  const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-2";
  const provider = new GeminiStructuredProvider(apiKey, model);
  const retriever = new ContextRetriever(
    new DrizzleContextRepository(database),
    new GeminiEmbeddingProvider(apiKey, embeddingModel),
    {
      topK: readNumber("AI_RETRIEVAL_TOP_K", 5),
      similarityThreshold: readNumber("AI_RETRIEVAL_SIMILARITY_THRESHOLD", 0.68),
    },
  );

  try {
    const result = await evaluateEssay({
      provider,
      retriever,
      logger: new AiCallLogger(database),
      question: evaluationInput.question,
      answer: evaluationInput.answer,
      rubric: evaluationInput.rubric,
      topicId: evaluationInput.topicId,
      technologyIds: evaluationInput.technologyIds,
    });
    await store.appendEvaluation({
      sessionId: input.sessionId,
      answerId: input.answerId,
      rubricId: evaluationInput.rubric.id,
      model: result.model,
      promptVersion: ESSAY_EVALUATION_PROMPT_VERSION,
      output: result.output,
      sourceChunkIds: result.sourceChunkIds,
      correlationId: result.correlationId,
      providerResponseId: result.providerResponseId,
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });
    return result;
  } catch (error) {
    await store.markEvaluationFailed(input.sessionId);
    throw error;
  }
}

function readNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

