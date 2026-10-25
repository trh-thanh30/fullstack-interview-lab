import { describe, expect, it } from "vitest";

import { isAllowedEmail, parseAllowedEmails } from "../allowlist";

describe("authentication email allowlist", () => {
  it("normalizes comma, semicolon, whitespace and letter casing", () => {
    expect(
      parseAllowedEmails(" Owner@Example.com,second@example.com; third@example.com\n"),
    ).toEqual(
      new Set(["owner@example.com", "second@example.com", "third@example.com"]),
    );
  });

  it("allows only an exact normalized email match", () => {
    const configuredEmails = "owner@example.com, teammate@example.com";

    expect(isAllowedEmail("OWNER@example.com", configuredEmails)).toBe(true);
    expect(isAllowedEmail("attacker@owner.example.com", configuredEmails)).toBe(false);
    expect(isAllowedEmail(null, configuredEmails)).toBe(false);
  });

  it("denies everyone when no allowlist is configured", () => {
    expect(isAllowedEmail("owner@example.com", undefined)).toBe(false);
  });
});
