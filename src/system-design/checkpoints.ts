export const systemDesignCheckpoints = [
  { key: "clarify", label: "Clarify", prompt: "Làm rõ actor, use case, scope và những điều cần hỏi lại interviewer.", focus: ["requirements", "security"] },
  { key: "estimate", label: "Estimate", prompt: "Ước lượng traffic, storage, bandwidth và ghi rõ mọi assumption.", focus: ["estimation", "scaling"] },
  { key: "high_level", label: "High-level design", prompt: "Mô tả component chính, API boundary và data flow end-to-end.", focus: ["architecture", "data"] },
  { key: "deep_dive", label: "Deep dive", prompt: "Đi sâu vào data model, consistency, bottleneck và failure mode quan trọng nhất.", focus: ["data", "scaling", "reliability"] },
  { key: "tradeoffs", label: "Trade-offs", prompt: "So sánh các phương án, nêu điều gì được đánh đổi và khi nào quyết định cần thay đổi.", focus: ["architecture", "reliability", "security"] },
  { key: "summary", label: "Summary", prompt: "Tóm tắt thiết kế, assumption còn mở, rủi ro và bước kiểm chứng tiếp theo.", focus: ["requirements", "architecture", "reliability"] },
] as const;

export type SystemDesignCheckpoint = (typeof systemDesignCheckpoints)[number]["key"];

export function checkpointAt(position: number) {
  return systemDesignCheckpoints[position] ?? null;
}
