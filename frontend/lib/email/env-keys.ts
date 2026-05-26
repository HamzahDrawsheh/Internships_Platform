/** Environment variable names used for SMTP (server-side only). */
export const SMTP_ENV_KEYS = {
  host: "SMTP_HOST",
  port: "SMTP_PORT",
  secure: "SMTP_SECURE",
  user: "SMTP_USER",
  password: "SMTP_PASSWORD",
  fromEmail: "SMTP_FROM_EMAIL",
  fromName: "SMTP_FROM_NAME",
} as const;

/** Resend HTTP API (fallback when SMTP ports are blocked). */
export const RESEND_ENV_KEYS = {
  apiKey: "RESEND_API_KEY",
  fromEmail: "RESEND_FROM_EMAIL",
} as const;

/** Gmail implicit TLS defaults (port 465). */
export const GMAIL_SMTP_DEFAULTS = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
} as const;
