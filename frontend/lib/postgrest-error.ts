/**
 * PostgREST errors are plain objects; logging them directly often prints "{}".
 */
export function logPostgrestError(scope: string, err: unknown): void {
  if (err == null) {
    console.error(scope, "(null/undefined error)");
    return;
  }
  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    const message = typeof o.message === "string" ? o.message : "(no message)";
    const code = typeof o.code === "string" ? o.code : "";
    const details = typeof o.details === "string" ? o.details : "";
    const hint = typeof o.hint === "string" ? o.hint : "";
    console.error(scope, message, code ? `[${code}]` : "", details, hint);
    return;
  }
  console.error(scope, err);
}
