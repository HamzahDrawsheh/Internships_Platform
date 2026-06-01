import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_TITLE = "Internship";
const DEFAULT_COMPANY = "Company";

/** Resolve listing title for a student's enrolled internship (works when listing is inactive). */
export async function fetchStudentEnrolledPositionTitle(
  supabase: SupabaseClient,
  args: {
    studentId: string;
    applicationId: string | null;
    companyId: string | null;
  },
): Promise<string> {
  let positionId: string | null = null;

  if (args.applicationId) {
    const { data: app } = await supabase
      .from("applications")
      .select("position_id")
      .eq("id", args.applicationId)
      .maybeSingle();
    positionId = app?.position_id ?? null;
  }

  if (!positionId) {
    const { data: apps } = await supabase
      .from("applications")
      .select("position_id")
      .eq("student_id", args.studentId)
      .in("status", ["accepted", "completed"])
      .order("committed_at", { ascending: false, nullsFirst: false })
      .order("applied_at", { ascending: false });

    for (const row of apps ?? []) {
      if (!row.position_id) continue;
      if (!args.companyId) {
        positionId = row.position_id;
        break;
      }
      const { data: pos } = await supabase
        .from("internship_positions")
        .select("company_id")
        .eq("id", row.position_id)
        .maybeSingle();
      if (pos?.company_id === args.companyId) {
        positionId = row.position_id;
        break;
      }
    }
  }

  if (!positionId) return DEFAULT_TITLE;

  const { data: pos } = await supabase
    .from("internship_positions")
    .select("title")
    .eq("id", positionId)
    .maybeSingle();

  const title = pos?.title?.trim();
  return title || DEFAULT_TITLE;
}

export async function fetchStudentEnrolledCompanyMeta(
  supabase: SupabaseClient,
  companyId: string | null,
): Promise<{ companyName: string; companyLogoUrl: string | null }> {
  if (!companyId) {
    return { companyName: DEFAULT_COMPANY, companyLogoUrl: null };
  }
  const { data: companyRow } = await supabase
    .from("companies")
    .select("company_name, logo_url")
    .eq("id", companyId)
    .maybeSingle();

  return {
    companyName: companyRow?.company_name?.trim() || DEFAULT_COMPANY,
    companyLogoUrl: companyRow?.logo_url ?? null,
  };
}
