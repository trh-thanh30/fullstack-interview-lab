import { extendedQuestionSeed } from "./extended-question-data";
import { fresherQuestionSeed } from "./fresher-question-data";
import { expandedFresherQuestionSeed } from "./fresher-packs";
import { javaSqlExamQuestionSeed } from "./java-sql-exam-question-data";
import { starterQuestionSeed } from "./starter-question-data";

export const fullstackQuestionSeed = [
  ...starterQuestionSeed,
  ...extendedQuestionSeed,
  ...fresherQuestionSeed,
  ...expandedFresherQuestionSeed,
  ...javaSqlExamQuestionSeed,
];
