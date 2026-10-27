import { describe, expect, it, vi } from "vitest";

import {
  generateQuestionDraft,
  InvalidGeneratedQuestionError,
  type GenerationSource,
  type QuestionGenerationProvider,
  type QuestionGenerationRepository,
} from "../question-generation";

const userId = "00000000-0000-4000-8000-000000000001";
const sourceId = "10000000-0000-4000-8000-000000000001";
const topicId = "20000000-0000-4000-8000-000000000001";

describe("question generation", () => {
  it("persists a valid result as a sourced draft with generation audit", async () => {
    const repository = repositoryWith([source()]);
    const provider = providerWith(validMcq());

    const result = await generateQuestionDraft({
      repository,
      provider,
      sourceChunkIds: [sourceId],
      type: "mcq",
      userId,
    });

    expect(result).toEqual({ id: "draft-id", attempts: 1 });
    expect(repository.createGeneratedDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        question: expect.objectContaining({
          status: "draft",
          isManual: false,
          sourceChunkIds: [sourceId],
          topicId,
        }),
        generation: expect.objectContaining({
          model: "test-model",
          promptVersion: "qb-002-v1",
          inputTokens: 120,
          outputTokens: 80,
        }),
      }),
    );
  });

  it("retries invalid structured output once and then succeeds", async () => {
    const repository = repositoryWith([source()]);
    const provider = providerWith(
      { ...validMcq(), choices: validMcq().choices.map((choice) => ({ ...choice, isCorrect: false })) },
      validMcq(),
    );

    const result = await generateQuestionDraft({
      repository,
      provider,
      sourceChunkIds: [sourceId],
      type: "mcq",
      userId,
    });

    expect(result.attempts).toBe(2);
    expect(provider.generate).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid output after the bounded retry", async () => {
    const repository = repositoryWith([source()]);
    const invalid = { ...validMcq(), prompt: "short" };
    const provider = providerWith(invalid, invalid);

    await expect(
      generateQuestionDraft({ repository, provider, sourceChunkIds: [sourceId], type: "mcq", userId }),
    ).rejects.toBeInstanceOf(InvalidGeneratedQuestionError);
    expect(provider.generate).toHaveBeenCalledTimes(2);
    expect(repository.createGeneratedDraft).not.toHaveBeenCalled();
  });

  it("requires normalized source category before calling AI", async () => {
    const repository = repositoryWith([{ ...source(), topicId: null }]);
    const provider = providerWith(validMcq());

    await expect(
      generateQuestionDraft({ repository, provider, sourceChunkIds: [sourceId], type: "mcq", userId }),
    ).rejects.toThrow("source:normalize");
    expect(provider.generate).not.toHaveBeenCalled();
  });
});

function source(): GenerationSource {
  return {
    id: sourceId,
    topicId,
    sourceTitle: "Node source",
    heading: "Event loop",
    pageNumber: null,
    content: "The event loop schedules microtasks before the next phase.",
    technologyIds: ["30000000-0000-4000-8000-000000000001"],
  };
}

function validMcq() {
  return {
    prompt: "Trong Node.js, microtask queue được xử lý vào thời điểm nào?",
    explanation: "Microtasks được xử lý sau operation hiện tại và trước phase tiếp theo.",
    level: "middle" as const,
    choices: [
      { content: "Trước phase tiếp theo", isCorrect: true },
      { content: "Chỉ khi process thoát", isCorrect: false },
    ],
    rubric: [],
    referenceAnswer: null,
  };
}

function providerWith(...outputs: unknown[]) {
  let index = 0;
  return {
    generate: vi.fn(async () => ({
      output: outputs[Math.min(index++, outputs.length - 1)],
      providerResponseId: "response-id",
      model: "test-model",
      inputTokens: 120,
      outputTokens: 80,
    })),
  } satisfies QuestionGenerationProvider;
}

function repositoryWith(sources: GenerationSource[]) {
  return {
    getGenerationSources: vi.fn(async () => sources),
    createGeneratedDraft: vi.fn(async () => "draft-id"),
  } satisfies QuestionGenerationRepository;
}
