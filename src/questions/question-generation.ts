import { z } from "zod";

import { questionLevelValues, type RubricDimension } from "@/db/schema";

import { editableQuestionTypeValues, type QuestionWriteInput } from "./question-form";

export const QUESTION_GENERATION_PROMPT_VERSION = "qb-002-v1";

const rubricKeyValues = ["correctness", "completeness", "clarity", "practical"] as const;

export const generatedQuestionOutputSchema = z.object({
  prompt: z.string().trim().min(10).max(20_000),
  explanation: z.string().trim().min(1).max(30_000),
  level: z.enum(questionLevelValues),
  choices: z
    .array(
      z.object({
        content: z.string().trim().min(1).max(10_000),
        isCorrect: z.boolean(),
      }),
    )
    .max(6),
  rubric: z.array(
    z.object({
      key: z.enum(rubricKeyValues),
      label: z.string().trim().min(1).max(100),
      description: z.string().trim().min(1).max(5_000),
      weight: z.number().int().min(1).max(100),
    }),
  ).max(4),
  referenceAnswer: z.string().trim().max(30_000).nullable(),
});

export type GeneratedQuestionOutput = z.infer<typeof generatedQuestionOutputSchema>;
export type GeneratedQuestionType = (typeof editableQuestionTypeValues)[number];

export type GenerationSource = {
  id: string;
  topicId: string | null;
  sourceTitle: string;
  heading: string | null;
  pageNumber: number | null;
  content: string;
  technologyIds: string[];
};

export type QuestionGenerationResult = {
  output: unknown;
  providerResponseId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export interface QuestionGenerationProvider {
  generate(input: {
    type: GeneratedQuestionType;
    sources: GenerationSource[];
    promptVersion: string;
  }): Promise<QuestionGenerationResult>;
}

export interface QuestionGenerationRepository {
  getGenerationSources(sourceChunkIds: string[]): Promise<GenerationSource[]>;
  createGeneratedDraft(input: {
    question: QuestionWriteInput;
    userId: string;
    generation: Omit<QuestionGenerationResult, "output"> & { promptVersion: string };
  }): Promise<string>;
}

export async function generateQuestionDraft(options: {
  repository: QuestionGenerationRepository;
  provider: QuestionGenerationProvider;
  sourceChunkIds: string[];
  type: GeneratedQuestionType;
  userId: string;
  maxAttempts?: number;
}) {
  const request = z
    .object({
      sourceChunkIds: z.array(z.uuid()).min(1).max(5),
      type: z.enum(editableQuestionTypeValues),
      userId: z.uuid(),
    })
    .parse({
      sourceChunkIds: [...new Set(options.sourceChunkIds)],
      type: options.type,
      userId: options.userId,
    });
  const sources = await options.repository.getGenerationSources(request.sourceChunkIds);

  if (sources.length !== request.sourceChunkIds.length) {
    throw new Error("Một hoặc nhiều source chunks không tồn tại hoặc chưa được xử lý.");
  }
  const topicId = sources[0]?.topicId;
  if (!topicId) {
    throw new Error("Source chunk chưa có category. Hãy chạy source:normalize trước.");
  }

  const maxAttempts = Math.min(Math.max(options.maxAttempts ?? 2, 1), 2);
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await options.provider.generate({
        type: request.type,
        sources,
        promptVersion: QUESTION_GENERATION_PROMPT_VERSION,
      });
      const output = validateGeneratedQuestion(result.output, request.type);
      const technologyIds = [...new Set(sources.flatMap((source) => source.technologyIds))];
      const question = toDraftQuestion(output, request.type, topicId, technologyIds, request.sourceChunkIds);
      const id = await options.repository.createGeneratedDraft({
        question,
        userId: request.userId,
        generation: {
          providerResponseId: result.providerResponseId,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          promptVersion: QUESTION_GENERATION_PROMPT_VERSION,
        },
      });

      return { id, attempts: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("AI generation failed.");
      if (!(lastError instanceof InvalidGeneratedQuestionError)) throw lastError;
    }
  }

  throw lastError ?? new Error("AI generation failed.");
}

export class InvalidGeneratedQuestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGeneratedQuestionError";
  }
}

function validateGeneratedQuestion(output: unknown, type: GeneratedQuestionType) {
  const parsed = generatedQuestionOutputSchema.safeParse(output);
  if (!parsed.success) {
    throw new InvalidGeneratedQuestionError("AI output không đúng schema câu hỏi.");
  }

  if (type === "mcq") {
    if (parsed.data.choices.length < 2 || parsed.data.choices.filter((choice) => choice.isCorrect).length !== 1) {
      throw new InvalidGeneratedQuestionError("MCQ do AI sinh phải có đúng một đáp án đúng.");
    }
    if (parsed.data.rubric.length !== 0 || parsed.data.referenceAnswer !== null) {
      throw new InvalidGeneratedQuestionError("MCQ do AI sinh không được chứa rubric tự luận.");
    }
  } else {
    const keys = new Set(parsed.data.rubric.map(({ key }) => key));
    const totalWeight = parsed.data.rubric.reduce((total, dimension) => total + dimension.weight, 0);
    if (parsed.data.choices.length !== 0 || keys.size !== 4 || totalWeight !== 100 || !parsed.data.referenceAnswer) {
      throw new InvalidGeneratedQuestionError("Câu tự luận do AI sinh phải có đủ rubric và reference answer.");
    }
  }

  return parsed.data;
}

function toDraftQuestion(
  output: GeneratedQuestionOutput,
  type: GeneratedQuestionType,
  topicId: string,
  technologyIds: string[],
  sourceChunkIds: string[],
): QuestionWriteInput {
  return {
    topicId,
    technologyIds,
    type,
    level: output.level,
    status: "draft",
    prompt: output.prompt,
    explanation: output.explanation,
    isManual: false,
    sourceChunkIds,
    choices: type === "mcq"
      ? output.choices.map((choice, position) => ({ ...choice, position }))
      : [],
    rubric: type === "mcq"
      ? null
      : {
          dimensions: output.rubric as RubricDimension[],
          referenceAnswer: output.referenceAnswer,
        },
  };
}
