import type {
  questionLevelValues,
  sourceContentTypeValues,
} from "@/db/schema";

export type SourceLevel = (typeof questionLevelValues)[number];
export type SourceContentType = (typeof sourceContentTypeValues)[number];

export type ChunkClassification = {
  chunkId: string;
  topicSlug: string;
  technologySlugs: string[];
  level: SourceLevel;
  contentType: SourceContentType;
};

type TechnologyDefinition = {
  slug: string;
  topicSlug: string;
  aliases: string[];
};

const TECHNOLOGIES: TechnologyDefinition[] = [
  { slug: "javascript", topicSlug: "frontend", aliases: ["javascript", "ecmascript", "js"] },
  { slug: "typescript", topicSlug: "frontend", aliases: ["typescript", "ts"] },
  { slug: "react", topicSlug: "frontend", aliases: ["react.js", "reactjs", "react"] },
  { slug: "nextjs", topicSlug: "frontend", aliases: ["next.js", "nextjs", "next js"] },
  { slug: "html", topicSlug: "frontend", aliases: ["html"] },
  { slug: "css", topicSlug: "frontend", aliases: ["css", "tailwind"] },
  { slug: "nodejs", topicSlug: "backend", aliases: ["node.js", "nodejs", "node js", "node"] },
  { slug: "express", topicSlug: "backend", aliases: ["express.js", "expressjs", "express"] },
  { slug: "nestjs", topicSlug: "backend", aliases: ["nest.js", "nestjs", "nest js"] },
  { slug: "postgresql", topicSlug: "backend", aliases: ["postgresql", "postgres", "psql"] },
  { slug: "redis", topicSlug: "backend", aliases: ["redis"] },
  { slug: "docker", topicSlug: "devops", aliases: ["docker", "dockerfile"] },
  { slug: "kubernetes", topicSlug: "devops", aliases: ["kubernetes", "k8s"] },
  { slug: "ci-cd", topicSlug: "devops", aliases: ["ci/cd", "ci-cd", "continuous integration", "continuous delivery", "continuous deployment"] },
  { slug: "server", topicSlug: "devops", aliases: ["web server", "server"] },
  { slug: "system-design", topicSlug: "architecture", aliases: ["system design", "thiết kế hệ thống"] },
  { slug: "design-patterns", topicSlug: "architecture", aliases: ["design patterns", "design pattern", "mẫu thiết kế"] },
  { slug: "clean-architecture", topicSlug: "architecture", aliases: ["clean architecture", "kiến trúc sạch"] },
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  frontend: ["frontend", "front-end", "browser", "dom", "giao diện"],
  backend: ["backend", "back-end", "api", "database", "cơ sở dữ liệu"],
  devops: ["devops", "deployment", "infrastructure", "hạ tầng"],
  architecture: ["architecture", "kiến trúc", "scalability", "distributed system"],
};

const LEVEL_KEYWORDS: Record<SourceLevel, string[]> = {
  junior: ["junior", "beginner", "basic", "fundamental", "cơ bản", "nhập môn"],
  middle: ["middle", "mid-level", "intermediate", "trung cấp"],
  senior: ["senior", "advanced", "expert", "nâng cao", "chuyên sâu", "trade-off"],
};

const normalizedAliasToSlug = new Map(
  TECHNOLOGIES.flatMap((technology) =>
    technology.aliases.map((alias) => [normalizeTerm(alias), technology.slug] as const),
  ),
);

export function normalizeTechnologyName(value: string) {
  return normalizedAliasToSlug.get(normalizeTerm(value)) ?? null;
}

export function classifySourceChunk(input: {
  id: string;
  heading: string | null;
  content: string;
  sourceTitle: string;
  sourceUri: string;
}): ChunkClassification {
  const heading = normalizeText(input.heading ?? "");
  const body = normalizeText(input.content);
  const sourceContext = normalizeText(`${input.sourceTitle} ${input.sourceUri}`);
  const technologyScores = TECHNOLOGIES.map((technology) => ({
    ...technology,
    score: technology.aliases.reduce(
      (score, alias) =>
        score +
        countAlias(heading, alias) * 4 +
        countAlias(body, alias) +
        countAlias(sourceContext, alias) * 2,
      0,
    ),
  })).filter((technology) => technology.score > 0);

  const technologySlugs = technologyScores
    .sort((left, right) => right.score - left.score || left.slug.localeCompare(right.slug))
    .map((technology) => technology.slug);
  const topicScores = new Map<string, number>();

  for (const technology of technologyScores) {
    topicScores.set(
      technology.topicSlug,
      (topicScores.get(technology.topicSlug) ?? 0) + technology.score,
    );
  }

  for (const [topicSlug, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const score = keywords.reduce(
      (total, keyword) =>
        total +
        countAlias(heading, keyword) * 4 +
        countAlias(body, keyword) +
        countAlias(sourceContext, keyword) * 2,
      0,
    );
    topicScores.set(topicSlug, (topicScores.get(topicSlug) ?? 0) + score);
  }

  const topicSlug = [...topicScores.entries()].sort(
    ([leftSlug, leftScore], [rightSlug, rightScore]) =>
      rightScore - leftScore || leftSlug.localeCompare(rightSlug),
  )[0]?.[0] ?? "architecture";

  return {
    chunkId: input.id,
    topicSlug,
    technologySlugs,
    level: detectLevel(`${heading} ${body}`),
    contentType: detectContentType(input.content),
  };
}

function detectLevel(text: string): SourceLevel {
  const scores = Object.entries(LEVEL_KEYWORDS).map(([level, keywords]) => ({
    level: level as SourceLevel,
    score: keywords.reduce((total, keyword) => total + countAlias(text, keyword), 0),
  }));
  const bestMatch = scores.sort((left, right) => right.score - left.score)[0];

  return bestMatch?.score ? bestMatch.level : "middle";
}

function detectContentType(content: string): SourceContentType {
  const hasCode = /```[\s\S]*?```|^ {4}\S/m.test(content);
  const hasQuestion = /\?|\b(question|interview|quiz)\b|\b(câu hỏi|phỏng vấn)\b/iu.test(content);

  if (hasCode && hasQuestion) return "mixed";
  if (hasQuestion) return "question";
  if (hasCode) return "example";
  if (/\b(reference|cheat ?sheet|glossary)\b|\b(tham khảo|thuật ngữ)\b/iu.test(content)) {
    return "reference";
  }
  return "concept";
}

function countAlias(text: string, alias: string) {
  const normalizedAlias = normalizeText(alias);
  const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "giu"))?.length ?? 0;
}

function normalizeTerm(value: string) {
  return normalizeText(value).replace(/[.\s/_-]+/g, "");
}

function normalizeText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("vi-VN");
}
