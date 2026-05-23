import type { SupabaseClient } from "@supabase/supabase-js";

/** Calls DB function to refresh locked/unlocked/overdue monthly report statuses. */
export async function syncInternshipReportStatuses(
  supabase: SupabaseClient,
  internshipId?: string
): Promise<void> {
  const { error } = await supabase.rpc("sync_internship_report_statuses", {
    p_internship: internshipId ?? null,
  });
  if (error) {
    console.error("sync_internship_report_statuses:", error);
  }
}

/** Creates internship tracking + monthly/weekly/attendance rows for current student. */
export async function ensureStudentInternshipTracking(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("ensure_student_internship_tracking");
  if (error) {
    console.error("ensure_student_internship_tracking:", error);
  }
}

/** Regenerates missing monthly reports, weekly slots, and attendance for one internship. */
export async function repairInternshipTracking(
  supabase: SupabaseClient,
  internshipId: string
): Promise<void> {
  const { error } = await supabase.rpc("repair_internship_tracking", {
    p_internship: internshipId,
  });
  if (error) {
    console.error("repair_internship_tracking:", error);
  }
}

/** Ensures weekly description rows exist for a monthly report form. */
export async function ensureMonthlyReportWeeklySlots(
  supabase: SupabaseClient,
  monthlyReportId: string
): Promise<void> {
  const { error } = await supabase.rpc("ensure_monthly_report_weekly_slots", {
    p_monthly_report: monthlyReportId,
  });
  if (error) {
    console.error("ensure_monthly_report_weekly_slots:", error);
  }
}
