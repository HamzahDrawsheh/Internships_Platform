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

/**
 * Marks accepted applications as completed when `training_end_date` has passed (see migration
 * `20260508200000_training_schedule_auto_complete.sql`). Safe to call on every student load.
 */
export async function invokeAutoCompleteExpiredTrainings(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("auto_complete_expired_trainings");
  if (!error) return;

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
        "[auto_complete_expired_trainings] RPC unavailable — apply migration `20260508200000_training_schedule_auto_complete.sql`.",
        text || "(no message)"
      );
    }
    return;
  }

  console.error("[auto_complete_expired_trainings]", text);
}
