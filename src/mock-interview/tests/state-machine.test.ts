import { describe, expect, it } from "vitest";

import { assertInterviewTransition, canInterviewTransition, interviewTransitions } from "../state-machine";

describe("mock interview state machine", () => {
  it("allows every primary interview path", () => {
    expect(canInterviewTransition("setup", "asking")).toBe(true);
    expect(canInterviewTransition("asking", "answering")).toBe(true);
    expect(canInterviewTransition("answering", "evaluating")).toBe(true);
    expect(canInterviewTransition("evaluating", "follow_up")).toBe(true);
    expect(canInterviewTransition("follow_up", "evaluating")).toBe(true);
    expect(canInterviewTransition("evaluating", "asking")).toBe(true);
    expect(canInterviewTransition("evaluating", "summary")).toBe(true);
    expect(canInterviewTransition("summary", "completed")).toBe(true);
  });

  it("allows abandoning only active states", () => {
    for (const state of ["setup", "asking", "answering", "follow_up", "evaluating"] as const) {
      expect(interviewTransitions[state]).toContain("abandoned");
    }
    expect(canInterviewTransition("summary", "abandoned")).toBe(false);
    expect(canInterviewTransition("completed", "abandoned")).toBe(false);
  });

  it("rejects invalid and backward transitions", () => {
    expect(() => assertInterviewTransition("setup", "answering")).toThrow("setup sang answering");
    expect(() => assertInterviewTransition("answering", "asking")).toThrow();
    expect(() => assertInterviewTransition("completed", "setup")).toThrow();
  });
});
