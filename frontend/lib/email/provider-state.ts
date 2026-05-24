export type EmailProviderId = "smtp" | "resend";

let smtpNetworkBlocked = false;
let smtpVerifyCompleted = false;
let smtpVerifyOk = false;
let lastSmtpVerifyError: string | null = null;
let activeProvider: EmailProviderId | null = null;

export function getActiveEmailProvider(): EmailProviderId | null {
  return activeProvider;
}

export function setActiveEmailProvider(provider: EmailProviderId): void {
  activeProvider = provider;
  console.info(`[email] Active delivery provider: ${provider}`);
}

export function isSmtpNetworkBlocked(): boolean {
  return smtpNetworkBlocked;
}

export function markSmtpNetworkBlocked(error: unknown): void {
  smtpNetworkBlocked = true;
  lastSmtpVerifyError =
    error instanceof Error ? error.message : typeof error === "string" ? error : "unknown";
  console.warn("[email] SMTP network block detected — will prefer Resend when available", {
    error: lastSmtpVerifyError,
  });
}

export function recordSmtpVerifyResult(ok: boolean, error?: unknown): void {
  smtpVerifyCompleted = true;
  smtpVerifyOk = ok;
  if (!ok && error) {
    lastSmtpVerifyError = error instanceof Error ? error.message : String(error);
  } else if (ok) {
    lastSmtpVerifyError = null;
    smtpNetworkBlocked = false;
  }
}

export function getSmtpVerifySnapshot(): {
  attempted: boolean;
  ok: boolean;
  networkBlocked: boolean;
  lastError: string | null;
} {
  return {
    attempted: smtpVerifyCompleted,
    ok: smtpVerifyOk,
    networkBlocked: smtpNetworkBlocked,
    lastError: lastSmtpVerifyError,
  };
}

export function resetEmailProviderStateForTests(): void {
  smtpNetworkBlocked = false;
  smtpVerifyCompleted = false;
  smtpVerifyOk = false;
  lastSmtpVerifyError = null;
  activeProvider = null;
}
