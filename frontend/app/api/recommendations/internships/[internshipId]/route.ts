import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deriveCompanyLevel, type CompanyLevel } from "@/lib/companies/evaluation";
import { scoreInternshipMatch, type InternshipMatchResult } from "@/lib/recommendations/internship-match";
import { parseLocationPrefsFromSearchParams } from "@/lib/recommendations/location-prefs";
import { parsePgVector } from "@/lib/ai/vector-utils";
import { createServerTranslator, parseLocaleFromRequest } from "@/lib/i18n/server-locale";

export async function GET(
  request: Request,
  context: { params: Promise<{ internshipId: string }> }
) {
  const { internshipId } = await context.params;
  const trimmedId = internshipId?.trim();
  if (!trimmedId) {
    return NextResponse.json({ ok: false, error: "missing_internship_id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const locationPrefs = parseLocationPrefsFromSearchParams(url.searchParams);

  let supabaseAuth;
  try {
    supabaseAuth = await createClient();
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAuth
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: "profile_error" }, { status: 500 });
  }

  if (profile?.role !== "student") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const [{ data: student, error: studentError }, { data: position, error: positionError }] =
    await Promise.all([
      admin.from("students").select("id, embedding, skills, major, department").eq("user_id", user.id).maybeSingle(),
      admin
        .from("internship_positions")
        .select(
          "id, title, embedding, company_id, requirements, description, location, additional_notes, is_active"
        )
        .eq("id", trimmedId)
        .maybeSingle(),
    ]);

  if (studentError || positionError) {
    return NextResponse.json({ ok: false, error: "lookup_failed" }, { status: 500 });
  }

  if (!position) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const studentVec = parsePgVector(student?.embedding ?? null);
  if (!student?.id || !studentVec) {
    return NextResponse.json({
      ok: true,
      match: null as InternshipMatchResult | null,
      message: "complete_profile_for_match",
    });
  }

  const { data: additional } = await admin
    .from("student_additional_info")
    .select("technical_skills, soft_skills, taken_courses, custom_courses, preferred_field")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: company } = await admin
    .from("companies")
    .select("id, company_name, location, is_new_company, evaluation_enabled, company_score")
    .eq("id", position.company_id)
    .maybeSingle();

  const companyWithLevel = company
    ? { ...company, company_level: deriveCompanyLevel(company) as CompanyLevel | null }
    : company;

  const studentSources = {
    skills: student.skills ?? null,
    major: student.major ?? null,
    department: student.department ?? null,
    technical_skills: additional?.technical_skills ?? undefined,
    soft_skills: additional?.soft_skills ?? undefined,
    taken_courses: additional?.taken_courses ?? undefined,
    custom_courses: additional?.custom_courses ?? undefined,
    preferred_field: additional?.preferred_field ?? undefined,
  };

  const t = createServerTranslator(parseLocaleFromRequest(request));
  const match = scoreInternshipMatch({
    position,
    company: companyWithLevel,
    companyName: String(company?.company_name ?? "Company"),
    studentVec,
    studentSources,
    locationPrefs,
    t,
  });

  if (!match) {
    return NextResponse.json({
      ok: true,
      match: null as InternshipMatchResult | null,
      message: "embedding_unavailable",
    });
  }

  return NextResponse.json({ ok: true, match });
}
