const emailSeparator = /[,;\s]+/;

export function parseAllowedEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(emailSeparator)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedEmail(
  email: string | null | undefined,
  configuredEmails = process.env.ALLOWED_EMAILS,
) {
  if (!email) {
    return false;
  }

  return parseAllowedEmails(configuredEmails).has(email.trim().toLowerCase());
}
