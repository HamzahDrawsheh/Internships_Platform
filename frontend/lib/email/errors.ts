export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * True when the host/network likely blocks outbound SMTP (not auth failures).
 */
export function isSmtpNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const code = getErrorCode(error) ?? "";
  const combined = `${code} ${message}`.toUpperCase();

  return (
    /ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EHOSTUNREACH|ESOCKET|ETIMEOUT|ECONNABORTED/.test(
      combined
    ) || combined.includes("CONNECT ETIMEDOUT")
  );
}

export function describeSmtpNetworkBlock(error: unknown): string {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  return [
    "Outbound SMTP appears blocked or unreachable from this network/host.",
    code ? `code=${code}` : null,
    `detail=${message}`,
    "Common causes: ISP/firewall blocking ports 587/465, university/corporate Wi‑Fi, or cloud hosts that disable SMTP.",
    "Use Resend (HTTPS) by setting RESEND_API_KEY in .env.local.",
  ]
    .filter(Boolean)
    .join(" ");
}
