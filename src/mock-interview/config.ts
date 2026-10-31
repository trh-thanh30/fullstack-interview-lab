import { z } from "zod";

import { questionLevelValues } from "@/db/schema";

export const mockInterviewConfigurationSchema = z.object({
  topicIds: z.array(z.uuid()).max(8),
  technologyIds: z.array(z.uuid()).max(12),
  level: z.enum(questionLevelValues),
  questionCount: z.coerce.number().int().min(2).max(12),
  durationMinutes: z.coerce.number().int().min(10).max(120),
  maxFollowUpsPerQuestion: z.coerce.number().int().min(0).max(3),
});

export type MockInterviewConfiguration = z.infer<typeof mockInterviewConfigurationSchema>;

export function parseMockInterviewFormData(formData: FormData) {
  return mockInterviewConfigurationSchema.safeParse({
    topicIds: formData.getAll("topicIds").map(String),
    technologyIds: formData.getAll("technologyIds").map(String),
    level: formData.get("level") ?? "middle",
    questionCount: formData.get("questionCount") ?? 5,
    durationMinutes: formData.get("durationMinutes") ?? 35,
    maxFollowUpsPerQuestion: formData.get("maxFollowUpsPerQuestion") ?? 1,
  });
}
