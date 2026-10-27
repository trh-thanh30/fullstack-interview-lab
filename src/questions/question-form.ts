import { z } from "zod";

import {
  questionLevelValues,
  questionStatusValues,
  type RubricDimension,
} from "@/db/schema";

export const editableQuestionTypeValues = [
  "mcq",
  "short_answer",
  "deep_dive",
  "system_design",
] as const;

const nonEmptyLines = z
  .string()
  .transform((value) => value.split("\n").map((item) => item.trim()).filter(Boolean));

const questionFormSchema = z
  .object({
    topicId: z.uuid("Hãy chọn category."),
    technologyIds: nonEmptyLines,
    type: z.enum(editableQuestionTypeValues),
    level: z.enum(questionLevelValues),
    status: z.enum(questionStatusValues),
    prompt: z.string().trim().min(10, "Câu hỏi cần ít nhất 10 ký tự.").max(20_000),
    explanation: z.string().trim().max(30_000),
    isManual: z.boolean(),
    sourceChunkIds: nonEmptyLines,
    choices: z.array(z.string().trim().max(10_000)),
    correctChoice: z.coerce.number().int().min(-1).max(5),
    rubricCorrectness: z.string().trim().max(5_000),
    rubricCompleteness: z.string().trim().max(5_000),
    rubricClarity: z.string().trim().max(5_000),
    rubricPractical: z.string().trim().max(5_000),
    referenceAnswer: z.string().trim().max(30_000),
  })
  .superRefine((value, context) => {
    const choices = value.choices.filter(Boolean);
    const isPublishing = value.status === "published";

    if (value.type === "mcq") {
      if (choices.length < 2) {
        context.addIssue({ code: "custom", path: ["choices"], message: "MCQ cần ít nhất 2 lựa chọn." });
      }
      if (isPublishing && (value.correctChoice < 0 || !value.choices[value.correctChoice]?.trim())) {
        context.addIssue({ code: "custom", path: ["correctChoice"], message: "MCQ published phải có đáp án đúng." });
      }
    }

    const rubricValues = [
      value.rubricCorrectness,
      value.rubricCompleteness,
      value.rubricClarity,
      value.rubricPractical,
    ];
    if (value.type !== "mcq" && isPublishing && rubricValues.some((item) => !item)) {
      context.addIssue({ code: "custom", path: ["rubric"], message: "Câu tự luận published phải có đủ rubric." });
    }

    if (isPublishing && !value.isManual && value.sourceChunkIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["sourceChunkIds"],
        message: "Câu published phải có source hoặc được đánh dấu manual.",
      });
    }
  });

export type QuestionWriteInput = {
  topicId: string;
  technologyIds: string[];
  type: (typeof editableQuestionTypeValues)[number];
  level: (typeof questionLevelValues)[number];
  status: (typeof questionStatusValues)[number];
  prompt: string;
  explanation: string | null;
  isManual: boolean;
  sourceChunkIds: string[];
  choices: Array<{ content: string; isCorrect: boolean; position: number }>;
  rubric: { dimensions: RubricDimension[]; referenceAnswer: string | null } | null;
};

export type QuestionFormState = {
  message: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string | string[]>;
};

export const initialQuestionFormState: QuestionFormState = { message: "" };

export function parseQuestionFormData(formData: FormData) {
  const values = {
    topicId: String(formData.get("topicId") ?? ""),
    technologyIds: formData.getAll("technologyIds").map(String).join("\n"),
    type: String(formData.get("type") ?? ""),
    level: String(formData.get("level") ?? ""),
    status: String(formData.get("status") ?? "draft"),
    prompt: String(formData.get("prompt") ?? ""),
    explanation: String(formData.get("explanation") ?? ""),
    isManual: formData.get("isManual") === "on",
    sourceChunkIds: formData.getAll("sourceChunkIds").map(String).join("\n"),
    choices: Array.from({ length: 6 }, (_, index) => String(formData.get(`choice-${index}`) ?? "")),
    correctChoice: String(formData.get("correctChoice") ?? "-1"),
    rubricCorrectness: String(formData.get("rubricCorrectness") ?? ""),
    rubricCompleteness: String(formData.get("rubricCompleteness") ?? ""),
    rubricClarity: String(formData.get("rubricClarity") ?? ""),
    rubricPractical: String(formData.get("rubricPractical") ?? ""),
    referenceAnswer: String(formData.get("referenceAnswer") ?? ""),
  };
  const result = questionFormSchema.safeParse(values);

  if (!result.success) {
    const state: QuestionFormState = {
      message: "Hãy kiểm tra lại các trường được đánh dấu.",
      fieldErrors: result.error.flatten().fieldErrors,
      values: Object.fromEntries(
        [...formData.entries()].map(([key, value]) => [key, String(value)]),
      ),
    };

    return {
      success: false as const,
      state,
    };
  }

  const data = result.data;
  const choices = data.choices
    .map((content, originalPosition) => ({ content, originalPosition }))
    .filter(({ content }) => content)
    .map(({ content, originalPosition }, position) => ({
      content,
      position,
      isCorrect: originalPosition === data.correctChoice,
    }));
  const rubricValues = [
    ["correctness", "Correctness", data.rubricCorrectness, 40],
    ["completeness", "Completeness", data.rubricCompleteness, 30],
    ["clarity", "Clarity", data.rubricClarity, 15],
    ["practical", "Practical experience", data.rubricPractical, 15],
  ] as const;
  const dimensions: RubricDimension[] = rubricValues
    .filter(([, , description]) => description)
    .map(([key, label, description, weight]) => ({ key, label, description, weight }));

  return {
    success: true as const,
    data: {
      topicId: data.topicId,
      technologyIds: [...new Set(data.technologyIds)],
      type: data.type,
      level: data.level,
      status: data.status,
      prompt: data.prompt,
      explanation: data.explanation || null,
      isManual: data.isManual,
      sourceChunkIds: [...new Set(data.sourceChunkIds)],
      choices: data.type === "mcq" ? choices : [],
      rubric:
        data.type === "mcq" || (dimensions.length === 0 && !data.referenceAnswer)
          ? null
          : { dimensions, referenceAnswer: data.referenceAnswer || null },
    } satisfies QuestionWriteInput,
  };
}
