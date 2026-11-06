import nextEnv from "@next/env";

import { GeminiStructuredProvider } from "../src/ai/gemini-provider";
import { goldenEvalDataset } from "../src/ai/evals/golden-dataset";
import { runLiveGoldenCase } from "../src/ai/evals/regression";
import { getRequiredEnv } from "../src/lib/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const provider = new GeminiStructuredProvider(
  getRequiredEnv("GOOGLE_GENERATIVE_AI_API_KEY"),
  process.env.GEMINI_EVALUATION_MODEL?.trim() || "gemini-2.5-flash",
);
let failed = false;
for (const testCase of goldenEvalDataset) {
  const result = await runLiveGoldenCase(provider, testCase);
  console.info(`${result.passed ? "PASS" : "FAIL"} ${testCase.id}: score=${result.score}, delta=${result.delta}, model=${result.model}`);
  if (!result.passed) failed = true;
}
if (failed) {
  console.error("AI regression exceeded tolerance. Do not deploy this model/prompt version.");
  process.exitCode = 1;
}
