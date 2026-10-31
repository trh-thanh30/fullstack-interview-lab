import type { sessionStateValues } from "@/db/schema";

export type InterviewState = (typeof sessionStateValues)[number];

const transitions = {
  setup: ["asking", "abandoned"],
  asking: ["answering", "summary", "abandoned"],
  answering: ["evaluating", "abandoned"],
  follow_up: ["evaluating", "abandoned"],
  evaluating: ["follow_up", "asking", "summary", "abandoned"],
  summary: ["completed"],
  completed: [],
  abandoned: [],
} as const satisfies Record<InterviewState, readonly InterviewState[]>;

export class InvalidInterviewTransitionError extends Error {
  constructor(from: InterviewState, to: InterviewState) {
    super(`Interview không thể chuyển từ ${from} sang ${to}.`);
    this.name = "InvalidInterviewTransitionError";
  }
}

export class StaleInterviewSessionError extends Error {
  constructor() {
    super("Session đã thay đổi ở request khác. Hãy tải lại trước khi tiếp tục.");
    this.name = "StaleInterviewSessionError";
  }
}

export function assertInterviewTransition(from: InterviewState, to: InterviewState) {
  if (!(transitions[from] as readonly InterviewState[]).includes(to)) {
    throw new InvalidInterviewTransitionError(from, to);
  }
}

export function canInterviewTransition(from: InterviewState, to: InterviewState) {
  return (transitions[from] as readonly InterviewState[]).includes(to);
}

export const interviewTransitions = transitions;
