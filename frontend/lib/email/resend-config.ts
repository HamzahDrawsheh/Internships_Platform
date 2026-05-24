import { ensureSmtpEnvLoaded } from "@/lib/env/load-smtp-env";
import { isEnvPlaceholderValue } from "@/lib/env/env-placeholders";
import { RESEND_ENV_KEYS, SMTP_ENV_KEYS } from "@/lib/email/env-keys";

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

export function getResendConfigurationStatus():
  | { configured: true; summary: { fromEmail: string; fromName: string } }
  | { configured: false; missing: string[] } {
  if (typeof window === "undefined") {
    ensureSmtpEnvLoaded();
  }

  const apiKey = readEnv(RESEND_ENV_KEYS.apiKey);
  const missing: string[] = [];

  if (isEnvPlaceholderValue(apiKey)) {
    missing.push(RESEND_ENV_KEYS.apiKey);
  }

  const fromEmail =
    readEnv(RESEND_ENV_KEYS.fromEmail) || readEnv(SMTP_ENV_KEYS.fromEmail);
  if (isEnvPlaceholderValue(fromEmail)) {
    missing.push(`${RESEND_ENV_KEYS.fromEmail} or ${SMTP_ENV_KEYS.fromEmail}`);
  }

  if (missing.length > 0) {
    return { configured: false, missing };
  }

  return {
    configured: true,
    summary: {
      fromEmail,
      fromName: readEnv(SMTP_ENV_KEYS.fromName) || "AI Intern Jordan",
    },
  };
}

export function getResendConfig(): ResendConfig | null {
  const status = getResendConfigurationStatus();
  if (!status.configured) return null;

  return {
    apiKey: readEnv(RESEND_ENV_KEYS.apiKey),
    fromEmail: status.summary.fromEmail,
    fromName: status.summary.fromName,
  };
}

export function isResendConfigured(): boolean {
  return getResendConfigurationStatus().configured;
}
