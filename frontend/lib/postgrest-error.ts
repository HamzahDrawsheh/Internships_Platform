/**
 * PostgREST / Supabase errors are plain objects; logging them directly often prints "{}".
 */

export type PostgrestErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

export function toPostgrestErrorLike(err: unknown): PostgrestErrorLike | null {
  if (err == null) return null;
  if (typeof err !== "object") return { message: String(err) };
  const o = err as Record<string, unknown>;
  return {
    message: typeof o.message === "string" ? o.message : undefined,
    code: typeof o.code === "string" ? o.code : undefined,
    details: typeof o.details === "string" ? o.details : undefined,
    hint: typeof o.hint === "string" ? o.hint : undefined,
    status: typeof o.status === "number" ? o.status : undefined,
  };
}

export function formatPostgrestError(err: unknown): string {
  const o = toPostgrestErrorLike(err);
  if (!o) return "Unknown error";
  const parts = [o.message, o.code ? `[${o.code}]` : "", o.details, o.hint].filter(Boolean);
  return parts.join(" ").trim() || "Unknown database error";
}

export function logPostgrestError(scope: string, err: unknown): void {
  const formatted = formatPostgrestError(err);
  const o = toPostgrestErrorLike(err);
  console.error(scope, formatted, o ?? err);
}

const NOTIFICATION_COLUMN_MARKERS = [
  "email_notifications",
  "push_notifications",
  "marketing_notifications",
  "notification_preference",
] as const;

export function isMissingNotificationSettingsColumns(err: unknown): boolean {
  const combined = formatPostgrestError(err).toLowerCase();
  const o = toPostgrestErrorLike(err);
  if (o?.code === "PGRST204" || o?.code === "42703") {
    return NOTIFICATION_COLUMN_MARKERS.some((name) => combined.includes(name)) || combined.includes("schema cache");
  }
  return NOTIFICATION_COLUMN_MARKERS.some((name) => combined.includes(name));
}

/** @deprecated Use isMissingNotificationSettingsColumns */
export function isMissingNotificationPreferenceColumn(err: unknown): boolean {
  return isMissingNotificationSettingsColumns(err);
}

export function isRlsDeniedError(err: unknown): boolean {
  const o = toPostgrestErrorLike(err);
  return o?.code === "42501" || formatPostgrestError(err).toLowerCase().includes("row-level security");
}
