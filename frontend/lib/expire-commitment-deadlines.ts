import type { SupabaseClient } from "@supabase/supabase-js";

function formatRpcError(err: unknown): string {
  if (err == null) return "unknown error";
  if (typeof err !== "object") return String(err);
  const o = err as Record<string, unknown>;
  const parts = [o.message, o.details, o.hint, o.code].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  return parts.length > 0 ? parts.join(" | ") : "unknown error";
}

function rpcErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code?: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return "";
}

async function drainTransactionalEmailQueue(): Promise<void> {
  try {
    await fetch("/api/notifications/process-email-queue", { method: "POST" });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[transactional_email_queue] drain request failed:", err);
    }
  }
}

/** Expires accepted offers the student did not confirm within the deadline. */
export async function invokeExpireStaleApplicationCommitments(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("expire_stale_application_commitments");
  if (!error) {
    void drainTransactionalEmailQueue();
    return;
  }

  const text = formatRpcError(error);
  const code = rpcErrorCode(error);
  const missingRpc =
    code === "PGRST202" ||
    code === "42883" ||
    /does not exist/i.test(text) ||
    /could not find/i.test(text) ||
    /schema cache/i.test(text);

  if (missingRpc) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[expire_stale_application_commitments] RPC unavailable — apply migration `20260525180000_application_commitment_flow.sql`.",
        text || "(no message)"
      );
    }
    return;
  }

  console.error("[expire_stale_application_commitments]", text);
}
