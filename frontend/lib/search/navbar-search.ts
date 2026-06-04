import type { SidebarIconName } from "@/components/layout/SidebarIcon";
import type { ProfileRole } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NavSearchLink = {
  labelKey: string;
  href: string;
  icon: SidebarIconName;
  keywords: string[];
  action?: "open-assistant";
};

export type InternshipSearchHit = {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
};

export type CompanySearchHit = {
  id: string;
  name: string;
  location: string | null;
};

export type PersonSearchHit = {
  id: string;
  name: string;
  subtitle: string | null;
  href: string;
  icon: SidebarIconName;
};

export type RecordSearchHit = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  icon: SidebarIconName;
};

export type NavbarSearchResults = {
  pages: NavSearchLink[];
  people: PersonSearchHit[];
  records: RecordSearchHit[];
  internships: InternshipSearchHit[];
  companies: CompanySearchHit[];
};

export const EMPTY_NAVBAR_SEARCH_RESULTS: NavbarSearchResults = {
  pages: [],
  people: [],
  records: [],
  internships: [],
  companies: [],
};

export const REMOTE_SEARCH_MIN_CHARS = 2;

export const STUDENT_NAV_SEARCH_LINKS: NavSearchLink[] = [
  { labelKey: "nav.dashboard", href: "/dashboard/student", icon: "dashboard", keywords: ["dashboard", "home", "لوحة"] },
  { labelKey: "nav.yourSupervisor", href: "/dashboard/student/supervisor", icon: "academic", keywords: ["supervisor", "academic", "professor", "مشرف"] },
  { labelKey: "nav.browseInternships", href: "/internships", icon: "briefcase", keywords: ["internship", "jobs", "browse", "تدريب"] },
  { labelKey: "nav.browseCompanies", href: "/companies", icon: "building", keywords: ["company", "employer", "شركة"] },
  { labelKey: "nav.myApplications", href: "/applications", icon: "document", keywords: ["application", "applied", "طلب"] },
  { labelKey: "nav.monthlyReports", href: "/dashboard/student/internship-reports", icon: "calendar", keywords: ["report", "monthly", "تقرير"] },
  { labelKey: "nav.cvBuilder", href: "/resume-builder", icon: "clipboard", keywords: ["cv", "resume", "سيرة"] },
  { labelKey: "nav.interviewSimulator", href: "/dashboard/student/interview-simulator", icon: "message", keywords: ["interview", "mock", "مقابلة"] },
  { labelKey: "nav.messages", href: "/dashboard/student/messages", icon: "message", keywords: ["message", "chat", "inbox", "رسائل"] },
  { labelKey: "nav.askAi", href: "/dashboard/student", icon: "chart", action: "open-assistant", keywords: ["ai", "assistant", "help", "مساعد"] },
  { labelKey: "nav.profile", href: "/profile/student", icon: "user", keywords: ["profile", "skills", "ملف"] },
  { labelKey: "nav.notificationSettings", href: "/settings/notifications", icon: "bell", keywords: ["notification", "settings", "إشعار"] },
];

export const COMPANY_NAV_SEARCH_LINKS: NavSearchLink[] = [
  { labelKey: "nav.dashboard", href: "/dashboard/company", icon: "dashboard", keywords: ["dashboard", "home", "لوحة"] },
  { labelKey: "nav.myInternshipPosts", href: "/company/internships", icon: "briefcase", keywords: ["internship", "post", "listing", "تدريب"] },
  { labelKey: "nav.createInternship", href: "/company/internships/new", icon: "plus", keywords: ["create", "new", "post", "إنشاء"] },
  { labelKey: "nav.applications", href: "/company/applications", icon: "document", keywords: ["application", "applicant", "طلب"] },
  { labelKey: "nav.traineeReports", href: "/company/internship-reports", icon: "calendar", keywords: ["report", "trainee", "monthly", "تقرير"] },
  { labelKey: "nav.messages", href: "/company/messages", icon: "message", keywords: ["message", "chat", "inbox", "رسائل"] },
  { labelKey: "nav.companyProfile", href: "/profile/company", icon: "user", keywords: ["profile", "company", "ملف"] },
  { labelKey: "nav.notificationSettings", href: "/settings/notifications", icon: "bell", keywords: ["notification", "settings", "إشعار"] },
];

export const SUPERVISOR_NAV_SEARCH_LINKS: NavSearchLink[] = [
  { labelKey: "nav.dashboard", href: "/dashboard/supervisor", icon: "dashboard", keywords: ["dashboard", "home", "لوحة"] },
  { labelKey: "nav.browseCompanies", href: "/supervisor/companies", icon: "building", keywords: ["company", "employer", "شركة"] },
  { labelKey: "nav.students", href: "/supervisor/students", icon: "users", keywords: ["student", "trainee", "طالب"] },
  { labelKey: "nav.applications", href: "/supervisor/reports", icon: "document", keywords: ["application", "report", "طلب"] },
  { labelKey: "nav.monthlyReports", href: "/supervisor/internship-reports", icon: "calendar", keywords: ["report", "monthly", "تقرير"] },
  { labelKey: "nav.messages", href: "/supervisor/messages", icon: "message", keywords: ["message", "chat", "رسائل"] },
  { labelKey: "nav.profile", href: "/supervisor/profile", icon: "user", keywords: ["profile", "department", "ملف"] },
  { labelKey: "nav.notificationSettings", href: "/settings/notifications", icon: "bell", keywords: ["notification", "settings", "إشعار"] },
];

export const ADMIN_NAV_SEARCH_LINKS: NavSearchLink[] = [
  { labelKey: "nav.dashboard", href: "/admin/dashboard", icon: "dashboard", keywords: ["dashboard", "admin", "لوحة"] },
  { labelKey: "nav.onboardingRequests", href: "/admin/onboarding-requests", icon: "clipboard", keywords: ["onboarding", "request", "انضمام"] },
  { labelKey: "nav.users", href: "/admin/users", icon: "users", keywords: ["user", "users", "account", "مستخدم"] },
  { labelKey: "nav.internships", href: "/admin/internships", icon: "briefcase", keywords: ["internship", "position", "تدريب"] },
  { labelKey: "nav.applications", href: "/admin/applications", icon: "document", keywords: ["application", "طلب"] },
  { labelKey: "nav.feedbacks", href: "/admin/feedbacks", icon: "message", keywords: ["feedback", "rating", "تقييم"] },
  { labelKey: "nav.internshipReports", href: "/admin/internship-reports", icon: "calendar", keywords: ["report", "تقرير"] },
  { labelKey: "nav.analytics", href: "/admin/analytics", icon: "chart", keywords: ["analytics", "stats", "تحليل"] },
  { labelKey: "nav.notificationSettings", href: "/settings/notifications", icon: "bell", keywords: ["notification", "settings", "إشعار"] },
];

export type NavbarSearchCache = {
  people: PersonSearchHit[];
  records: RecordSearchHit[];
};

export type NavbarSearchRoleConfig = {
  navLinks: NavSearchLink[];
  placeholderKey: string;
  peopleSectionKey: string | null;
  recordsSectionKey: string | null;
  browseAllHref: ((q: string) => string) | null;
  remoteMode: "public-catalog" | "admin" | "none";
};

export function getNavbarSearchRoleConfig(role: ProfileRole): NavbarSearchRoleConfig {
  switch (role) {
    case "company":
      return {
        navLinks: COMPANY_NAV_SEARCH_LINKS,
        placeholderKey: "nav.navbarSearchPlaceholderCompany",
        peopleSectionKey: "nav.navbarSearchApplicants",
        recordsSectionKey: "nav.navbarSearchMyPosts",
        browseAllHref: null,
        remoteMode: "none",
      };
    case "supervisor":
      return {
        navLinks: SUPERVISOR_NAV_SEARCH_LINKS,
        placeholderKey: "nav.navbarSearchPlaceholderSupervisor",
        peopleSectionKey: "nav.navbarSearchStudents",
        recordsSectionKey: null,
        browseAllHref: null,
        remoteMode: "public-catalog",
      };
    case "admin":
      return {
        navLinks: ADMIN_NAV_SEARCH_LINKS,
        placeholderKey: "nav.navbarSearchPlaceholderAdmin",
        peopleSectionKey: "nav.navbarSearchUsers",
        recordsSectionKey: null,
        browseAllHref: null,
        remoteMode: "admin",
      };
    default:
      return {
        navLinks: STUDENT_NAV_SEARCH_LINKS,
        placeholderKey: "nav.navbarSearchPlaceholderStudent",
        peopleSectionKey: "nav.navbarSearchSupervisors",
        recordsSectionKey: "nav.navbarSearchApplications",
        browseAllHref: (q) => `/internships?search=${encodeURIComponent(q)}`,
        remoteMode: "public-catalog",
      };
  }
}

export function sanitizeSearchQuery(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

export function ilikePattern(query: string): string {
  return `%${query}%`;
}

function includesQuery(text: string | null | undefined, q: string): boolean {
  return Boolean(text?.trim() && text.toLowerCase().includes(q));
}

export function matchNavLinks(
  links: NavSearchLink[],
  query: string,
  t: (key: string) => string,
): NavSearchLink[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = links.map((link) => {
    const label = t(link.labelKey).toLowerCase();
    let score = 0;
    if (label === q) score = 100;
    else if (label.startsWith(q)) score = 80;
    else if (label.includes(q)) score = 60;
    if (link.keywords.some((k) => k === q)) score = Math.max(score, 70);
    else if (link.keywords.some((k) => k.startsWith(q) || q.startsWith(k))) score = Math.max(score, 50);
    else if (link.keywords.some((k) => k.includes(q) || q.includes(k))) score = Math.max(score, 30);
    return { link, score };
  }).filter((x) => x.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 8).map((x) => x.link);
}

function filterPeople(cache: PersonSearchHit[], rawQuery: string): PersonSearchHit[] {
  const q = sanitizeSearchQuery(rawQuery).toLowerCase();
  if (!q) return [];
  return cache
    .filter((p) => includesQuery(p.name, q) || includesQuery(p.subtitle, q))
    .slice(0, 6);
}

function filterRecords(cache: RecordSearchHit[], rawQuery: string): RecordSearchHit[] {
  const q = sanitizeSearchQuery(rawQuery).toLowerCase();
  if (!q) return [];
  return cache
    .filter((r) => includesQuery(r.title, q) || includesQuery(r.subtitle, q))
    .slice(0, 6);
}

export function buildLocalNavbarResults(
  role: ProfileRole,
  rawQuery: string,
  t: (key: string) => string,
  cache: NavbarSearchCache,
): Pick<NavbarSearchResults, "pages" | "people" | "records"> {
  const q = sanitizeSearchQuery(rawQuery);
  if (!q) return { pages: [], people: [], records: [] };
  const config = getNavbarSearchRoleConfig(role);
  return {
    pages: matchNavLinks(config.navLinks, q, t),
    people: config.peopleSectionKey ? filterPeople(cache.people, q) : [],
    records: config.recordsSectionKey ? filterRecords(cache.records, q) : [],
  };
}

export async function searchPublicCatalog(
  supabase: SupabaseClient,
  rawQuery: string,
  signal?: AbortSignal,
): Promise<Pick<NavbarSearchResults, "internships" | "companies">> {
  const q = sanitizeSearchQuery(rawQuery);
  if (q.length < REMOTE_SEARCH_MIN_CHARS || signal?.aborted) {
    return { internships: [], companies: [] };
  }

  const pattern = ilikePattern(q);
  const [{ data: positions }, { data: companies }] = await Promise.all([
    supabase
      .from("internship_positions")
      .select("id, title, location, companies(company_name)")
      .eq("is_active", true)
      .or(`title.ilike.${pattern},requirements.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("companies")
      .select("id, company_name, location")
      .or(`company_name.ilike.${pattern},location.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  if (signal?.aborted) return { internships: [], companies: [] };

  return {
    internships: (positions ?? []).map((row) => {
      const company = row.companies as { company_name?: string } | { company_name?: string }[] | null;
      const companyName = Array.isArray(company) ? (company[0]?.company_name ?? "") : (company?.company_name ?? "");
      return {
        id: row.id as string,
        title: String(row.title ?? ""),
        companyName,
        location: row.location != null ? String(row.location) : null,
      };
    }),
    companies: (companies ?? []).map((row) => ({
      id: row.id as string,
      name: String(row.company_name ?? ""),
      location: row.location != null ? String(row.location) : null,
    })),
  };
}

export async function searchAdminRemote(
  supabase: SupabaseClient,
  rawQuery: string,
  cache: NavbarSearchCache,
  signal?: AbortSignal,
): Promise<Pick<NavbarSearchResults, "internships" | "people">> {
  const q = sanitizeSearchQuery(rawQuery);
  if (q.length < REMOTE_SEARCH_MIN_CHARS || signal?.aborted) {
    return { internships: [], people: [] };
  }

  const pattern = ilikePattern(q);
  const [{ data: positions }, { data: profiles }] = await Promise.all([
    supabase
      .from("internship_positions")
      .select("id, title, location, companies(company_name)")
      .or(`title.ilike.${pattern},requirements.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(6),
  ]);

  if (signal?.aborted) return { internships: [], people: [] };

  const internships: InternshipSearchHit[] = (positions ?? []).map((row) => {
    const company = row.companies as { company_name?: string } | { company_name?: string }[] | null;
    const companyName = Array.isArray(company) ? (company[0]?.company_name ?? "") : (company?.company_name ?? "");
    return {
      id: row.id as string,
      title: String(row.title ?? ""),
      companyName,
      location: row.location != null ? String(row.location) : null,
    };
  });

  const cachedIds = new Set(cache.people.map((p) => p.id));
  const remotePeople: PersonSearchHit[] = (profiles ?? [])
    .filter((p) => !cachedIds.has(p.id as string))
    .map((p) => ({
      id: p.id as string,
      name: (p.full_name as string | null)?.trim() || (p.email as string | null)?.trim() || "—",
      subtitle: String(p.role ?? ""),
      href: "/admin/users",
      icon: "users" as SidebarIconName,
    }));

  return { internships, people: remotePeople.slice(0, 4) };
}

export async function prefetchNavbarSearchCache(
  supabase: SupabaseClient,
  role: ProfileRole,
): Promise<NavbarSearchCache> {
  switch (role) {
    case "company":
      return loadCompanySearchCache(supabase);
    case "supervisor":
      return loadSupervisorSearchCache(supabase);
    case "admin":
      return loadAdminSearchCache(supabase);
    default:
      return loadStudentSearchCache(supabase);
  }
}

async function loadStudentSearchCache(supabase: SupabaseClient): Promise<NavbarSearchCache> {
  const [{ data: supRows }, authUser] = await Promise.all([
    supabase.from("supervisors").select("id, user_id, department, title, university").order("created_at").limit(50),
    supabase.auth.getUser(),
  ]);

  const people: PersonSearchHit[] = [];
  const rows = supRows ?? [];
  if (rows.length > 0) {
    const userIds = rows.map((r) => r.user_id as string);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
    const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));
    for (const row of rows) {
      const p = profileById.get(row.user_id as string);
      people.push({
        id: row.user_id as string,
        name: (p?.full_name as string | null)?.trim() || (p?.email as string | null)?.trim() || "—",
        subtitle: [row.title, row.department, row.university].filter(Boolean).join(" · ") || null,
        href: "/dashboard/student/supervisor",
        icon: "academic",
      });
    }
  }

  const records: RecordSearchHit[] = [];
  const user = authUser.data.user;
  if (user) {
    const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
    if (student?.id) {
      const { data: appRows } = await supabase
        .from("applications")
        .select("id, status, position_id, internship_positions(title, companies(company_name))")
        .eq("student_id", student.id)
        .order("applied_at", { ascending: false })
        .limit(30);
      for (const row of appRows ?? []) {
        const pos = row.internship_positions as
          | { title?: string; companies?: { company_name?: string } | { company_name?: string }[] }
          | { title?: string; companies?: { company_name?: string } | { company_name?: string }[] }[]
          | null;
        const position = Array.isArray(pos) ? pos[0] : pos;
        const company = position?.companies;
        const companyName = Array.isArray(company) ? (company[0]?.company_name ?? "") : (company?.company_name ?? "");
        records.push({
          id: row.id as string,
          title: String(position?.title ?? "") || "—",
          subtitle: [companyName, row.status].filter(Boolean).join(" · ") || null,
          href: "/applications",
          icon: "document",
        });
      }
    }
  }

  return { people, records };
}

async function loadCompanySearchCache(supabase: SupabaseClient): Promise<NavbarSearchCache> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { people: [], records: [] };

  const { data: company } = await supabase.from("companies").select("id").eq("user_id", user.id).maybeSingle();
  if (!company?.id) return { people: [], records: [] };

  const { data: positions } = await supabase
    .from("internship_positions")
    .select("id, title, is_active")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const records: RecordSearchHit[] = (positions ?? []).map((p) => ({
    id: p.id as string,
    title: String(p.title ?? ""),
    subtitle: p.is_active ? "Active" : "Inactive",
    href: `/company/internships/${p.id}/applications`,
    icon: "briefcase",
  }));

  const positionIds = (positions ?? []).map((p) => p.id as string);
  if (positionIds.length === 0) return { people: [], records };

  const { data: apps } = await supabase
    .from("applications")
    .select("id, student_id, position_id, status")
    .in("position_id", positionIds)
    .order("applied_at", { ascending: false })
    .limit(40);

  const titleByPosition = new Map((positions ?? []).map((p) => [p.id as string, String(p.title ?? "")]));
  const studentIds = [...new Set((apps ?? []).map((a) => a.student_id as string))];
  const { data: students } = studentIds.length
    ? await supabase.from("students").select("id, user_id").in("id", studentIds)
    : { data: [] as { id: string; user_id: string }[] };

  const userIds = [...new Set((students ?? []).map((s) => s.user_id as string))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const profileByUserId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const studentById = new Map((students ?? []).map((s) => [s.id as string, s]));

  const people: PersonSearchHit[] = [];
  const seenUsers = new Set<string>();
  for (const app of apps ?? []) {
    const st = studentById.get(app.student_id as string);
    if (!st || seenUsers.has(st.user_id)) continue;
    seenUsers.add(st.user_id);
    const p = profileByUserId.get(st.user_id);
    people.push({
      id: st.user_id,
      name: (p?.full_name as string | null)?.trim() || (p?.email as string | null)?.trim() || "—",
      subtitle: [titleByPosition.get(app.position_id as string), app.status].filter(Boolean).join(" · ") || null,
      href: "/company/applications",
      icon: "user",
    });
  }

  return { people, records };
}

async function loadSupervisorSearchCache(supabase: SupabaseClient): Promise<NavbarSearchCache> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { people: [], records: [] };

  const { data: supervisor } = await supabase
    .from("supervisors")
    .select("department")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!supervisor?.department) return { people: [], records: [] };

  const { data: students } = await supabase
    .from("students")
    .select("id, user_id, university, department, major")
    .eq("department", supervisor.department)
    .limit(80);

  const userIds = [...new Set((students ?? []).map((s) => s.user_id as string))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const people: PersonSearchHit[] = (students ?? []).map((st) => {
    const p = profileById.get(st.user_id as string);
    return {
      id: st.id as string,
      name: (p?.full_name as string | null)?.trim() || (p?.email as string | null)?.trim() || "—",
      subtitle: [st.major, st.university].filter(Boolean).join(" · ") || st.department || null,
      href: `/supervisor/students/${st.id}`,
      icon: "user",
    };
  });

  return { people, records: [] };
}

async function loadAdminSearchCache(supabase: SupabaseClient): Promise<NavbarSearchCache> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("created_at", { ascending: false })
    .limit(120);

  const people: PersonSearchHit[] = (profiles ?? []).map((p) => ({
    id: p.id as string,
    name: (p.full_name as string | null)?.trim() || (p.email as string | null)?.trim() || "—",
    subtitle: String(p.role ?? ""),
    href: "/admin/users",
    icon: "users",
  }));

  return { people, records: [] };
}
