export type TopicEvidence = {
  topicId: string;
  topicName: string;
  attempts: number;
  correct: number;
  scoreSamples: number[];
  dimensionSamples: number[];
  lastPracticedAt: Date | null;
};

export type TopicRecommendation = {
  topicId: string;
  topicName: string;
  weaknessScore: number;
  accuracy: number | null;
  averageRubricScore: number | null;
  sampleSize: number;
  confidence: "low" | "medium" | "high";
  reasons: string[];
};

const DAY_MS = 86_400_000;

export function rankWeakTopics(evidence: TopicEvidence[], now = new Date()) {
  return evidence
    .map((topic): TopicRecommendation => {
      const rubricSamples = [...topic.scoreSamples, ...topic.dimensionSamples];
      const accuracy = topic.attempts ? topic.correct / topic.attempts : null;
      const averageRubricScore = rubricSamples.length
        ? average(rubricSamples) / 100
        : null;
      const performance = weightedPerformance(accuracy, averageRubricScore);
      const recencyDays = topic.lastPracticedAt
        ? Math.max(0, (now.getTime() - topic.lastPracticedAt.getTime()) / DAY_MS)
        : 45;
      const recencyRisk = Math.min(1, recencyDays / 30);
      const rubricGap = averageRubricScore === null ? 0.5 : 1 - averageRubricScore;
      const weaknessScore = Math.round(
        Math.min(1, Math.max(0, (1 - performance) * 0.55 + recencyRisk * 0.25 + rubricGap * 0.2)) *
          100,
      );
      const sampleSize = topic.attempts + topic.scoreSamples.length;
      const confidence = sampleSize < 3 ? "low" : sampleSize < 8 ? "medium" : "high";
      const reasons = [
        accuracy === null
          ? "Chưa có MCQ để đo accuracy"
          : `Accuracy ${Math.round(accuracy * 100)}% qua ${topic.attempts} lượt`,
        averageRubricScore === null
          ? "Chưa có rubric score"
          : `Rubric trung bình ${Math.round(averageRubricScore * 100)}/100`,
        topic.lastPracticedAt
          ? `Lần luyện gần nhất ${Math.floor(recencyDays)} ngày trước`
          : "Chưa từng luyện topic này",
      ];

      if (confidence === "low") reasons.push("Độ tin cậy thấp: cần ít nhất 3 mẫu");
      return {
        topicId: topic.topicId,
        topicName: topic.topicName,
        weaknessScore,
        accuracy: accuracy === null ? null : Math.round(accuracy * 100),
        averageRubricScore:
          averageRubricScore === null ? null : Math.round(averageRubricScore * 100),
        sampleSize,
        confidence,
        reasons,
      };
    })
    .sort(
      (left, right) =>
        right.weaknessScore - left.weaknessScore || left.topicName.localeCompare(right.topicName),
    );
}

function weightedPerformance(accuracy: number | null, rubric: number | null) {
  if (accuracy !== null && rubric !== null) return accuracy * 0.6 + rubric * 0.4;
  return accuracy ?? rubric ?? 0.35;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
