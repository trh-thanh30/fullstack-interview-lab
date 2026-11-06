// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const authRuntime = vi.hoisted(() => ({
  events: [] as string[],
  auth: vi.fn(async () => {
    authRuntime.events.push("auth");
    return {
      user: {
        email: "candidate@example.com",
        id: "user-1",
        image: null,
        name: "Candidate",
      },
    };
  }),
  connection: vi.fn(async () => {
    authRuntime.events.push("connection");
  }),
}));

vi.mock("next/server", () => ({ connection: authRuntime.connection }));
vi.mock("@/auth", () => ({ auth: authRuntime.auth }));
vi.mock("@/lib/auth/allowlist", () => ({ isAllowedEmail: () => true }));
vi.mock("server-only", () => ({}));

import { getAuthenticatedUser } from "../dal";

describe("authentication DAL", () => {
  beforeEach(() => {
    authRuntime.events.length = 0;
    authRuntime.auth.mockClear();
    authRuntime.connection.mockClear();
  });

  it("enters request time before Auth.js reads the current time", async () => {
    await expect(getAuthenticatedUser()).resolves.toMatchObject({ id: "user-1" });

    expect(authRuntime.events).toEqual(["connection", "auth"]);
  });
});
