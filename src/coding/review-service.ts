import { AiCallLogger } from "@/ai/ai-call-log";
import { GeminiStructuredProvider } from "@/ai/gemini-provider";
import { getDatabase } from "@/db/client";
import { getRequiredEnv } from "@/lib/env";

import { CodingStore } from "./coding-store";
import { CODING_REVIEW_PROMPT_VERSION, reviewCodeStatically } from "./coding-review";

export async function reviewAndPersistCode(userId: string, sessionId: string) {
  const database = getDatabase();
  const store = new CodingStore(database);
  const session = await store.getSession(userId, sessionId);
  if (!session) throw new Error("Coding session không tồn tại.");
  if (session.draft.code.trim().length < 20) throw new Error("Code cần ít nhất 20 ký tự trước khi review.");
  const provider = new GeminiStructuredProvider(getRequiredEnv("GOOGLE_GENERATIVE_AI_API_KEY"), process.env.GEMINI_EVALUATION_MODEL?.trim() || "gemini-2.5-flash");
  const result = await reviewCodeStatically({ provider, logger: new AiCallLogger(database), question: session.question.promptSnapshot, language: session.draft.language, code: session.draft.code, explanation: session.draft.explanation, rubric: session.question.rubricSnapshot });
  await store.appendReview({ userId, sessionId, output: result.output, model: result.model, promptVersion: CODING_REVIEW_PROMPT_VERSION, correlationId: result.correlationId, providerResponseId: result.providerResponseId });
  return result.output;
}
