import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).default("Interview Lab"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export function getRequiredEnv(
  name: string,
  environment: Record<string, string | undefined> = process.env,
) {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to .env.local for local development and to the deployment environment.`,
    );
  }

  return value;
}
