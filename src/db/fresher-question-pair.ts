import { mcq, type StarterQuestionSeed } from "./starter-question-data";

type FresherTopicSlug = "frontend" | "backend" | "devops" | "architecture";

export type FresherInterviewFact = {
  key: string;
  topicSlug: FresherTopicSlug;
  technologySlugs: string[];
  subject: string;
  definition: string;
  misconception: string;
  practice: string;
  principle: string;
};

/** Builds two complementary MCQs per concept: recognition and misconception. */
export function buildFresherInterviewPack(
  packKey: string,
  facts: FresherInterviewFact[],
): StarterQuestionSeed[] {
  return facts.flatMap((fact, index) => {
    const otherDefinitions = [1, 2, 3].map(
      (offset) => facts[(index + offset) % facts.length]!.definition,
    ) as [string, string, string];

    return [
      mcq(
        `fr2-${packKey}-${fact.key}-definition`,
        fact.topicSlug,
        fact.technologySlugs,
        "fresher",
        `Trong phỏng vấn Fresher, mô tả nào đúng nhất về ${fact.subject}?`,
        fact.definition,
        otherDefinitions,
        `${fact.definition} ${fact.principle}`,
      ),
      mcq(
        `fr2-${packKey}-${fact.key}-misconception`,
        fact.topicSlug,
        fact.technologySlugs,
        "fresher",
        `Nhận định nào SAI về ${fact.subject}?`,
        fact.misconception,
        [fact.definition, fact.practice, fact.principle],
        `Nhận định sai là: ${fact.misconception} Thực tế: ${fact.definition}`,
      ),
    ];
  });
}
