export const topicSeed = [
  {
    slug: "frontend",
    name: "Frontend",
    description: "Browser, UI engineering và các framework frontend.",
    position: 1,
  },
  {
    slug: "backend",
    name: "Backend",
    description: "Server-side application, API, data và distributed systems.",
    position: 2,
  },
  {
    slug: "devops",
    name: "DevOps",
    description: "Delivery pipeline, container, infrastructure và operations.",
    position: 3,
  },
  {
    slug: "architecture",
    name: "Architecture",
    description: "System design, application architecture và design patterns.",
    position: 4,
  },
] as const;

export const technologySeed = [
  { slug: "javascript", name: "JavaScript", topicSlug: "frontend" },
  { slug: "typescript", name: "TypeScript", topicSlug: "frontend" },
  { slug: "react", name: "React", topicSlug: "frontend" },
  { slug: "nextjs", name: "Next.js", topicSlug: "frontend" },
  { slug: "html", name: "HTML", topicSlug: "frontend" },
  { slug: "css", name: "CSS", topicSlug: "frontend" },
  { slug: "nodejs", name: "Node.js", topicSlug: "backend" },
  { slug: "express", name: "Express", topicSlug: "backend" },
  { slug: "nestjs", name: "NestJS", topicSlug: "backend" },
  { slug: "postgresql", name: "PostgreSQL", topicSlug: "backend" },
  { slug: "redis", name: "Redis", topicSlug: "backend" },
  { slug: "docker", name: "Docker", topicSlug: "devops" },
  { slug: "kubernetes", name: "Kubernetes", topicSlug: "devops" },
  { slug: "ci-cd", name: "CI/CD", topicSlug: "devops" },
  { slug: "server", name: "Server", topicSlug: "devops" },
  { slug: "system-design", name: "System Design", topicSlug: "architecture" },
  { slug: "design-patterns", name: "Design Patterns", topicSlug: "architecture" },
  { slug: "clean-architecture", name: "Clean Architecture", topicSlug: "architecture" },
] as const;
