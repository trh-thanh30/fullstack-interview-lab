import { describe, expect, it } from "vitest";

import { getRequiredEnv } from "../env";

describe("getRequiredEnv", () => {
  it("returns a configured value", () => {
    expect(getRequiredEnv("DATABASE_URL", { DATABASE_URL: "postgres://db" })).toBe(
      "postgres://db",
    );
  });

  it("throws a clear error when a required value is missing", () => {
    expect(() => getRequiredEnv("DATABASE_URL", {})).toThrow(
      "Missing required environment variable: DATABASE_URL",
    );
  });
});
