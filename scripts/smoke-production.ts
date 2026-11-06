import nextEnv from "@next/env";

import { getRequiredEnv } from "../src/lib/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const baseUrl = new URL(getRequiredEnv("PRODUCTION_URL"));
if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost") {
  throw new Error("PRODUCTION_URL phải dùng HTTPS.");
}
const authCookie = process.env.SMOKE_AUTH_COOKIE?.trim();
const failures: string[] = [];

await check("sign-in public", "/sign-in", [200]);
await check("private redirect", "/learn", [302, 303, 307, 308]);
await check("API unauthenticated", "/api/me", [401]);

if (authCookie) {
  for (const route of ["/", "/practice", "/essay", "/interview", "/learn", "/ops", "/settings/privacy"]) {
    await check(`authenticated ${route}`, route, [200], authCookie);
  }
  const reportSessionId = process.env.SMOKE_REPORT_SESSION_ID?.trim();
  if (reportSessionId) await check("authenticated interview report", `/interview/session/${reportSessionId}/report`, [200], authCookie);
} else {
  console.warn("SMOKE_AUTH_COOKIE chưa cấu hình: bỏ qua authenticated route checks.");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.info("Production smoke checks passed.");
}

async function check(name: string, path: string, expected: number[], cookie?: string) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "manual",
    headers: cookie ? { Cookie: cookie } : undefined,
  });
  const requiredHeaders = ["x-content-type-options", "x-frame-options", "referrer-policy"];
  const missing = requiredHeaders.filter((header) => !response.headers.has(header));
  if (!expected.includes(response.status) || missing.length) {
    failures.push(`FAIL ${name}: status=${response.status}, expected=${expected.join("|")}, missingHeaders=${missing.join(",") || "none"}`);
    return;
  }
  console.info(`PASS ${name}: ${response.status}`);
}
