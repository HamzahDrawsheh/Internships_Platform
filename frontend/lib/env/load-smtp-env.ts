import fs from "fs";
import path from "path";

import { SMTP_ENV_KEYS } from "@/lib/email/env-keys";
import { isEnvPlaceholderValue } from "@/lib/env/env-placeholders";

const SMTP_KEYS = [
  SMTP_ENV_KEYS.host,
  SMTP_ENV_KEYS.port,
  SMTP_ENV_KEYS.secure,
  SMTP_ENV_KEYS.user,
  SMTP_ENV_KEYS.password,
  SMTP_ENV_KEYS.fromEmail,
  SMTP_ENV_KEYS.fromName,
] as const;

const GMAIL_ALIASES: Record<string, readonly string[]> = {
  [SMTP_ENV_KEYS.user]: ["GMAIL_USER", "EMAIL_USER", "MAIL_USER"],
  [SMTP_ENV_KEYS.password]: ["GMAIL_APP_PASSWORD", "GMAIL_PASSWORD", "EMAIL_PASSWORD", "MAIL_PASSWORD"],
  [SMTP_ENV_KEYS.fromEmail]: ["GMAIL_FROM_EMAIL", "EMAIL_FROM", "MAIL_FROM"],
  [SMTP_ENV_KEYS.host]: ["GMAIL_SMTP_HOST", "MAIL_HOST"],
  [SMTP_ENV_KEYS.port]: ["GMAIL_SMTP_PORT", "MAIL_PORT"],
  [SMTP_ENV_KEYS.secure]: ["GMAIL_SMTP_SECURE", "MAIL_SECURE"],
  [SMTP_ENV_KEYS.fromName]: ["GMAIL_FROM_NAME", "MAIL_FROM_NAME"],
};

let merged = false;

function appRoot(): string {
  return process.cwd();
}

/** Parse KEY=VALUE lines (no dotenv dependency). Supports optional quotes. */
function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const out: Record<string, string> = {};
  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

function readProcessEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function resolveFromAliases(canonicalKey: string, files: Record<string, string>[]): string {
  const aliases = GMAIL_ALIASES[canonicalKey] ?? [];

  for (const source of [readProcessEnv(canonicalKey), ...files.flatMap((f) => [f[canonicalKey], ...aliases.map((a) => f[a])])]) {
    if (source && !isEnvPlaceholderValue(source)) {
      return source;
    }
  }

  return "";
}

/**
 * Next.js loads `.env.local` only — not `.env.example`.
 * Fills missing/placeholder SMTP_* values from `.env` / `.env.example` and common Gmail aliases.
 * Safe to call multiple times; runs once per process.
 */
export function ensureSmtpEnvLoaded(): void {
  if (merged) return;
  if (process.env.NEXT_RUNTIME === "edge") return;

  const root = appRoot();
  const envLocal = parseEnvFile(path.join(root, ".env.local"));
  const envFile = parseEnvFile(path.join(root, ".env"));
  const envExample = parseEnvFile(path.join(root, ".env.example"));
  const fileSources = [envLocal, envFile, envExample];

  const defaults: Partial<Record<string, string>> = {
    [SMTP_ENV_KEYS.host]: "smtp.gmail.com",
    [SMTP_ENV_KEYS.port]: "465",
    [SMTP_ENV_KEYS.secure]: "true",
  };

  for (const key of SMTP_KEYS) {
    const current = readProcessEnv(key);
    if (current && !isEnvPlaceholderValue(current)) {
      continue;
    }

    const resolved = resolveFromAliases(key, fileSources) || defaults[key] || "";
    if (resolved && !isEnvPlaceholderValue(resolved)) {
      process.env[key] = resolved;
    }
  }

  merged = true;
}
