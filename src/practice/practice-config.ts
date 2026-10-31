import { z } from "zod";

import { questionLevelValues } from "@/db/schema";

export const practiceStrategyValues = ["random", "weak_first"] as const;

export const practiceConfigurationSchema = z.object({
  topicId: z.union([z.uuid(), z.literal("")]).transform((value) => value || undefined),
  technologyIds: z.array(z.uuid()).max(8),
  level: z.union([z.enum(questionLevelValues), z.literal("")]).transform((value) => value || undefined),
  questionCount: z.coerce.number().int().min(1).max(50),
  strategy: z.enum(practiceStrategyValues),
});

export type PracticeConfiguration = z.infer<typeof practiceConfigurationSchema>;

export function parsePracticeFormData(formData: FormData) {
  return practiceConfigurationSchema.safeParse({
    topicId: String(formData.get("topicId") ?? ""),
    technologyIds: formData.getAll("technologyIds").map(String),
    level: String(formData.get("level") ?? ""),
    questionCount: formData.get("questionCount") ?? 10,
    strategy: formData.get("strategy") ?? "random",
  });
}

export function parsePracticeSearchParams(params: Record<string, string | string[] | undefined>) {
  const values = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  };
  const single = (key: string) => values(key)[0] ?? "";

  const parsed = practiceConfigurationSchema.safeParse({
    topicId: single("topicId"),
    technologyIds: values("technologyIds"),
    level: single("level"),
    questionCount: single("questionCount") || "10",
    strategy: single("strategy") || "random",
  });

  return parsed.success
    ? parsed.data
    : {
        topicId: undefined,
        technologyIds: [],
        level: undefined,
        questionCount: 10,
        strategy: "random" as const,
      };
}
