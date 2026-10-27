export type SimilarQuestionCandidate = {
  id: string;
  prompt: string;
  topicId: string;
  status: string;
  similarity: number;
};

type ComparableQuestion = Omit<SimilarQuestionCandidate, "similarity">;

export function findSimilarQuestions(
  question: ComparableQuestion,
  candidates: ComparableQuestion[],
  minimumSimilarity = 0.42,
) {
  return candidates
    .filter((candidate) => (
      candidate.id !== question.id &&
      candidate.topicId === question.topicId &&
      candidate.status !== "archived"
    ))
    .map((candidate) => ({
      ...candidate,
      similarity: promptSimilarity(question.prompt, candidate.prompt),
    }))
    .filter(({ similarity }) => similarity >= minimumSimilarity)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, 3);
}

export function promptSimilarity(left: string, right: string) {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (!leftTokens.size || !rightTokens.size) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  return (2 * intersection) / (leftTokens.size + rightTokens.size);
}

function tokenize(value: string) {
  return new Set(
    value
      .normalize("NFKC")
      .toLocaleLowerCase("vi")
      .match(/[\p{L}\p{N}+#.]+/gu) ?? [],
  );
}
