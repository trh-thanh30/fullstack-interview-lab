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

export const systemDesignProblemSeed = [
  {
    slug: "url-shortener",
    title: "Thiết kế dịch vụ rút gọn URL toàn cầu",
    level: "middle",
    context: "Thiết kế dịch vụ tạo short link và redirect người dùng với độ trễ thấp trên nhiều khu vực.",
    functionalRequirements: ["Tạo short URL", "Redirect sang URL gốc", "Thống kê click cơ bản"],
    nonFunctionalRequirements: ["99,99% availability cho redirect", "P99 dưới 100 ms", "Link tồn tại tối thiểu 5 năm"],
    constraints: ["100 triệu URL mới mỗi tháng", "Read/write xấp xỉ 100:1", "Analytics có thể eventual consistent"],
  },
  {
    slug: "notification-platform",
    title: "Thiết kế nền tảng notification đa kênh",
    level: "senior",
    context: "Thiết kế platform nhận event và gửi email, push notification hoặc SMS theo preference người dùng.",
    functionalRequirements: ["Nhận request idempotent", "Áp template và preference", "Theo dõi delivery và retry"],
    nonFunctionalRequirements: ["Không gửi trùng", "Chịu burst 1 triệu event/phút", "Provider failure không làm mất message"],
    constraints: ["Nhiều provider bên thứ ba", "Rate limit khác nhau theo kênh", "Chi phí SMS phải kiểm soát"],
  },
  {
    slug: "collaborative-interview-platform",
    title: "Thiết kế nền tảng phỏng vấn cộng tác",
    level: "senior",
    context: "Thiết kế phòng phỏng vấn cho interviewer và candidate cùng chỉnh code và lưu feedback theo thời gian thực.",
    functionalRequirements: ["Tạo và tham gia room", "Đồng bộ editor gần real-time", "Lưu transcript, rubric và decision"],
    nonFunctionalRequirements: ["Reconnect không mất draft", "Phân quyền rõ ràng", "Audit trail append-only"],
    constraints: ["Tối đa 10 người/phòng", "Không chạy untrusted code ở web tier", "Dữ liệu interview là private"],
  },
] as const;
