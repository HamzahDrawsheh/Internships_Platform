import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSavedContacts, type MessagingContact } from "@/lib/messaging/contacts";
import type { MessagingViewerRole } from "@/lib/messaging";

export type { MessagingContact };

export async function fetchCompaniesForStudentMessaging(studentDbId: string, supabase: SupabaseClient) {
  const { data: apps, error: appErr } = await supabase.from("applications").select("position_id").eq("student_id", studentDbId);
  if (appErr || !apps?.length) return [];
  const positionIds = [...new Set(apps.map((a) => a.position_id))];
  const { data: positions, error: posErr } = await supabase
    .from("internship_positions")
    .select("id, company_id")
    .in("id", positionIds);
  if (posErr || !positions?.length) return [];
  const companyIds = [...new Set(positions.map((p) => p.company_id))];
  const { data: companies, error: coErr } = await supabase
    .from("companies")
    .select("id, company_name, user_id")
    .in("id", companyIds);
  if (coErr || !companies?.length) return [];
  const byOwner = new Map<string, MessagingContact>();
  for (const c of companies) {
    if (!c.user_id) continue;
    byOwner.set(c.user_id, {
      userId: c.user_id,
      label: c.company_name?.trim() || "Company",
      kind: "student_company",
      subtitle: "Company",
    });
  }
  return [...byOwner.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchSupervisorsForStudentMessaging(supabase: SupabaseClient, studentDepartment: string) {
  const { data: supRows, error } = await supabase.from("supervisors").select("user_id, department, title").order("created_at");
  if (error || !supRows?.length) return [];
  const dept = studentDepartment.trim().toLowerCase();
  const matching = supRows.filter((s) => (s.department ?? "").trim().toLowerCase() === dept);
  if (!matching.length) return [];
  const userIds = matching.map((s) => s.user_id);
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
  return (profiles ?? [])
    .map((p) => ({
      userId: p.id,
      label: p.full_name?.trim() || p.email || "Supervisor",
      kind: "student_supervisor" as const,
      subtitle: "Supervisor",
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchSupervisorStudentPeers(supervisorDept: string, supabase: SupabaseClient): Promise<MessagingContact[]> {
  const { data: studentsData, error } = await supabase.from("students").select("user_id").eq("department", supervisorDept);
  if (error || !studentsData?.length) return [];
  const userIds = [...new Set(studentsData.map((s) => s.user_id))];
  const { data: profiles, error: pe } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
  if (pe || !profiles) return [];
  return profiles
    .map((p) => ({
      userId: p.id,
      label: p.full_name?.trim() || p.email || "Student",
      kind: "student_supervisor" as const,
      subtitle: "Student",
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchCompanyApplicantPeers(companyDbId: string, supabase: SupabaseClient): Promise<MessagingContact[]> {
  const { data: positions, error: pErr } = await supabase
    .from("internship_positions")
    .select("id")
    .eq("company_id", companyDbId);
  if (pErr || !positions?.length) return [];
  const posIds = positions.map((p) => p.id);
  const { data: apps, error: aErr } = await supabase.from("applications").select("student_id").in("position_id", posIds);
  if (aErr || !apps?.length) return [];
  const studentIds = [...new Set(apps.map((a) => a.student_id))];
  const { data: studentsRows, error: sErr } = await supabase.from("students").select("user_id").in("id", studentIds);
  if (sErr || !studentsRows?.length) return [];
  const userIds = [...new Set(studentsRows.map((s) => s.user_id))];
  const { data: profiles, error: pe } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
  if (pe || !profiles) return [];
  return profiles
    .map((p) => ({
      userId: p.id,
      label: p.full_name?.trim() || p.email || "Student",
      kind: "student_company" as const,
      subtitle: "Applicant",
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function mergeContacts(...lists: MessagingContact[][]): MessagingContact[] {
  const map = new Map<string, MessagingContact>();
  for (const list of lists) {
    for (const item of list) {
      const key = `${item.kind}:${item.userId}`;
      if (!map.has(key)) map.set(key, item);
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchEligiblePeers(
  supabase: SupabaseClient,
  viewerRole: MessagingViewerRole,
  viewerUserId: string,
): Promise<MessagingContact[]> {
  if (viewerRole === "student") {
    const { data: st } = await supabase.from("students").select("id, department").eq("user_id", viewerUserId).maybeSingle();
    const [companies, supervisors, saved] = await Promise.all([
      st?.id ? fetchCompaniesForStudentMessaging(st.id, supabase) : Promise.resolve([]),
      st?.department?.trim() ? fetchSupervisorsForStudentMessaging(supabase, st.department) : Promise.resolve([]),
      fetchSavedContacts(supabase, viewerUserId),
    ]);
    return mergeContacts(saved, companies, supervisors);
  }
  if (viewerRole === "supervisor") {
    const { data: supRow } = await supabase.from("supervisors").select("department").eq("user_id", viewerUserId).maybeSingle();
    const dept = supRow?.department?.trim();
    const [students, saved] = await Promise.all([
      dept ? fetchSupervisorStudentPeers(dept, supabase) : Promise.resolve([]),
      fetchSavedContacts(supabase, viewerUserId),
    ]);
    return mergeContacts(saved, students);
  }
  const { data: co } = await supabase.from("companies").select("id").eq("user_id", viewerUserId).maybeSingle();
  const [applicants, saved] = await Promise.all([
    co?.id ? fetchCompanyApplicantPeers(co.id, supabase) : Promise.resolve([]),
    fetchSavedContacts(supabase, viewerUserId),
  ]);
  return mergeContacts(saved, applicants);
}
