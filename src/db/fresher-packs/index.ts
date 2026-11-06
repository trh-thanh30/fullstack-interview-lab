import { backendDatabaseFresherPack } from "./backend-database-fresher-pack";
import { devopsAlgorithmFresherPack } from "./devops-algorithm-fresher-pack";
import { frontendFresherPack } from "./frontend-fresher-pack";
import { javascriptTypescriptFresherPack } from "./javascript-typescript-fresher-pack";
import { reactNextFresherPack } from "./react-next-fresher-pack";

export const expandedFresherQuestionSeed = [
  ...frontendFresherPack,
  ...javascriptTypescriptFresherPack,
  ...reactNextFresherPack,
  ...backendDatabaseFresherPack,
  ...devopsAlgorithmFresherPack,
];
