import type { NotificationRowType } from "@/lib/notifications-ui";

type NotificationLinkInput = {
  type: NotificationRowType | string;
  related_internship_id?: string | null;
  related_monthly_report_id?: string | null;
  viewerRole?: string | null;
};

/** Resolve deep link for monthly report notifications. */
export async function resolveMonthlyReportNotificationHref(
  supabase: { from: (t: string) => unknown },
  n: NotificationLinkInput
): Promise<string | null> {
  const internshipId = n.related_internship_id;
  if (!internshipId) return null;

  let monthNumber: number | null = null;
  if (n.related_monthly_report_id) {
    const q = supabase.from("internship_monthly_reports") as {
      select: (c: string) => { eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: { month_number?: number } | null }> } };
    };
    const { data } = await q.select("month_number").eq("id", n.related_monthly_report_id).maybeSingle();
    monthNumber = data?.month_number ?? null;
  }

  const role = n.viewerRole;
  const type = n.type;

  if (type === "internship_pending_supervisor" || type === "monthly_report_pending_supervisor") {
    if (role === "supervisor" && monthNumber) {
      return `/supervisor/internship-reports/${internshipId}/month/${monthNumber}`;
    }
    if (role === "supervisor") return "/supervisor/internship-reports";
  }

  if (type === "monthly_report_pending_employer" && role === "company" && monthNumber) {
    return `/company/internship-reports/${internshipId}/month/${monthNumber}`;
  }
  if (type === "monthly_report_pending_employer" && role === "company") {
    return `/company/internship-reports/${internshipId}/evaluations`;
  }

  if (
    (type === "monthly_report_unlocked" ||
      type === "monthly_report_overdue" ||
      type === "monthly_report_approved" ||
      type === "monthly_report_rejected" ||
      type === "final_report_required") &&
    role === "student"
  ) {
    if (monthNumber) {
      return `/dashboard/student/internship-reports/${internshipId}/month/${monthNumber}`;
    }
    return "/dashboard/student/internship-reports";
  }

  if (type === "internship_supervisor_approved" && role === "student") {
    return "/dashboard/student/internship-reports";
  }

  return null;
}
