import type { SupabaseClient } from "@supabase/supabase-js";

/** Application statuses where changing listing dates could confuse an active placement. */
export const LISTING_SCHEDULE_LOCK_STATUSES = [
  "accepted",
  "accepted_pending_commit",
  "completed",
] as const;

export async function countEnrolledApplicationsForPosition(
  supabase: SupabaseClient,
  positionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("position_id", positionId)
    .in("status", [...LISTING_SCHEDULE_LOCK_STATUSES]);

  if (error) {
    console.error("countEnrolledApplicationsForPosition:", error);
    return 0;
  }
  return count ?? 0;
}
