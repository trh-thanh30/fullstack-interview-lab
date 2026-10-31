export type ReportTurn = {
  id: string;
  topicName: string;
  prompt: string;
  answerId: string;
  score: number;
  dimensions: Record<string, number>;
  strengths: string[];
  missingPoints: string[];
  incorrectClaims: string[];
};

export function buildInterviewReport(turns: ReportTurn[]) {
  const evaluated = turns.filter(({ score }) => Number.isFinite(score));
  const overallScore = average(evaluated.map(({ score }) => score));
  const topicBuckets = groupBy(evaluated, ({ topicName }) => topicName);
  const dimensionKeys = [...new Set(evaluated.flatMap(({ dimensions }) => Object.keys(dimensions)))];
  const topicScores = Object.fromEntries(
    [...topicBuckets].map(([topic, items]) => [topic, average(items.map(({ score }) => score))]),
  );
  const dimensionScores = Object.fromEntries(
    dimensionKeys.map((key) => [key, average(evaluated.flatMap(({ dimensions }) => dimensions[key] === undefined ? [] : [dimensions[key]]))]),
  );
  const strongestTopics = Object.entries(topicScores).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name);
  const weakestTopics = Object.entries(topicScores).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([name]) => name);
  const weakDimensions = Object.entries(dimensionScores).filter(([, score]) => score < 70).sort((a, b) => a[1] - b[1]).map(([name]) => name);

  return {
    overallScore,
    topicScores,
    dimensionScores,
    strongestTopics,
    weakestTopics,
    weakDimensions,
    strengths: unique(evaluated.flatMap(({ strengths, id, answerId }) => strengths.map((text) => ({ text, turnId: id, answerId })))).slice(0, 8),
    gaps: unique(evaluated.flatMap(({ missingPoints, id, answerId }) => missingPoints.map((text) => ({ text, turnId: id, answerId })))).slice(0, 10),
    incorrectClaims: unique(evaluated.flatMap(({ incorrectClaims, id, answerId }) => incorrectClaims.map((text) => ({ text, turnId: id, answerId })))).slice(0, 10),
    recommendation: {
      topicNames: weakestTopics,
      dimensions: weakDimensions.slice(0, 2),
      questionCount: Math.min(8, Math.max(3, weakestTopics.length * 3)),
    },
    evaluatedCount: evaluated.length,
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function groupBy<T, K>(items: T[], key: (item: T) => K) {
  const grouped = new Map<K, T[]>();
  for (const item of items) grouped.set(key(item), [...(grouped.get(key(item)) ?? []), item]);
  return grouped;
}

function unique(items: Array<{ text: string; turnId: string; answerId: string }>) {
  const seen = new Set<string>();
  return items.filter(({ text }) => !seen.has(text) && Boolean(seen.add(text)));
}
