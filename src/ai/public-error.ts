import { AiProviderError } from "./provider";

export function publicAiError(error: unknown, fallback: string) {
  if (!(error instanceof AiProviderError)) return fallback;
  const reference = error.correlationId ? ` Mã theo dõi: ${error.correlationId}.` : "";
  return `${error.message}${reference}`;
}
