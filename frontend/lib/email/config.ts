import { ensureSmtpEnvLoaded } from "@/lib/env/load-smtp-env";
import { isEnvPlaceholderValue } from "@/lib/env/env-placeholders";
import { SMTP_ENV_KEYS } from "@/lib/email/env-keys";

export { SMTP_ENV_KEYS };

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function isUnsetOrPlaceholder(value: string): boolean {
  return isEnvPlaceholderValue(value);
}

/** @deprecated Use isEnvPlaceholderValue */
export function isSmtpPlaceholderValue(value: string): boolean {
  return isEnvPlaceholderValue(value);
}

export type SmtpConfigurationStatus =
  | {
      configured: true;
      summary: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        fromEmail: string;
        fromName: string;
      };
    }
  | {
      configured: false;
      missing: string[];
    };

/**
 * Validates SMTP env vars without exposing secrets.
 */
export function getSmtpConfigurationStatus(): SmtpConfigurationStatus {
  if (typeof window === "undefined") {
    ensureSmtpEnvLoaded();
  }

  const missing: string[] = [];

  const host = readEnv(SMTP_ENV_KEYS.host);
  const user = readEnv(SMTP_ENV_KEYS.user);
  const password = readEnv(SMTP_ENV_KEYS.password);
  const fromEmail = readEnv(SMTP_ENV_KEYS.fromEmail);

  if (isUnsetOrPlaceholder(host)) missing.push(SMTP_ENV_KEYS.host);
  if (isUnsetOrPlaceholder(user)) missing.push(SMTP_ENV_KEYS.user);
  if (isUnsetOrPlaceholder(password)) missing.push(SMTP_ENV_KEYS.password);
  if (isUnsetOrPlaceholder(fromEmail)) missing.push(SMTP_ENV_KEYS.fromEmail);

  const portRaw = readEnv(SMTP_ENV_KEYS.port) || "465";
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    missing.push(`${SMTP_ENV_KEYS.port} (invalid: "${portRaw}")`);
  }

  if (missing.length > 0) {
    return { configured: false, missing };
  }

  const secure =
    readEnv(SMTP_ENV_KEYS.secure).toLowerCase() === "true" || port === 465;

  return {
    configured: true,
    summary: {
      host,
      port,
      secure,
      user,
      fromEmail,
      fromName: readEnv(SMTP_ENV_KEYS.fromName) || "AI Intern Jordan",
    },
  };
}

export function getSmtpConfig(): SmtpConfig | null {
  const status = getSmtpConfigurationStatus();
  if (!status.configured) {
    return null;
  }

  const { summary } = status;
  return {
    host: summary.host,
    port: summary.port,
    secure: summary.secure,
    user: summary.user,
    password: readEnv(SMTP_ENV_KEYS.password),
    fromEmail: summary.fromEmail,
    fromName: summary.fromName,
  };
}

export function isEmailConfigured(): boolean {
  return getSmtpConfigurationStatus().configured;
}
