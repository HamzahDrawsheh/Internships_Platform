import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parsePgVector } from "@/lib/ai/vector-utils";
import { deriveCompanyLevel, type CompanyLevel } from "@/lib/companies/evaluation";
import { isInternshipOpenForApplications } from "@/lib/internships/application-deadline";
import { scoreInternshipMatch, type InternshipMatchResult } from "@/lib/recommendations/internship-match";
import { parseLocationPrefsFromSearchParams } from "@/lib/recommendations/location-prefs";
import { createServerTranslator, parseLocaleFromRequest } from "@/lib/i18n/server-locale";

const RECOMMENDATION_CACHE_TTL_MS = 60 * 60 * 1000;

function buildLocationPrefsKey(locationPrefs: ReturnType<typeof parseLocationPrefsFromSearchParams>): string {
  return JSON.stringify({
    city: locationPrefs.city?.trim().toLowerCase() ?? "",
    workType: locationPrefs.workType?.trim().toLowerCase() ?? "",
  });
}

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 6;
  const locationPrefs = parseLocationPrefsFromSearchParams(url.searchParams);
  const t = createServerTranslator(parseLocaleFromRequest(request));

  const admin = createAdminClient();

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, embedding, embedding_updated_at, skills, major, department")
    .eq("user_id", user.id)
    .maybeSingle();

  if (studentError) {
    return NextResponse.json({ ok: false, error: "student_lookup_failed" }, { status: 500 });
  }

  const studentVec = parsePgVector(student?.embedding ?? null);
  if (!student?.id || !studentVec) {
    return NextResponse.json({ ok: true, recommendations: [] as InternshipMatchResult[], location_prefs: locationPrefs });
  }

  const cacheKey = buildLocationPrefsKey(locationPrefs);
  const studentEmbeddingVersion = student.embedding_updated_at
    ? String(student.embedding_updated_at)
    : `unversioned:${student.id}`;
  const { data: cached } = await admin
    .from("student_recommendation_cache")
    .select("recommendations, generated_at")
    .eq("student_id", student.id)
    .eq("student_embedding_version", studentEmbeddingVersion)
    .eq("location_prefs_key", cacheKey)
    .maybeSingle();

  const generatedAt = cached?.generated_at ? new Date(String(cached.generated_at)).getTime() : 0;
  if (
    Array.isArray(cached?.recommendations) &&
    generatedAt > 0 &&
    Date.now() - generatedAt < RECOMMENDATION_CACHE_TTL_MS
  ) {
    return NextResponse.json({
      ok: true,
      cached: true,
      location_prefs: locationPrefs,
      recommendations: (cached.recommendations as InternshipMatchResult[]).slice(0, limit),
    });
  }

  const [{ data: additional }, { data: positions, error: positionsError }] = await Promise.all([
    admin
      .from("student_additional_info")
      .select("technical_skills, soft_skills, taken_courses, custom_courses, preferred_field")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("internship_positions")
      .select(
        "id, title, embedding, company_id, requirements, description, location, additional_notes, is_active, application_deadline, embedding_updated_at"
      )
      .eq("is_active", true)
      .not("embedding", "is", null)
      .order("embedding_updated_at", { ascending: false, nullsFirst: false })
      .limit(Math.max(100, limit * 10)),
  ]);

  if (positionsError) {
    return NextResponse.json({ ok: false, error: positionsError.message }, { status: 500 });
  }

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

  const rows = positions ?? [];
  const companyIds = [...new Set(rows.map((p) => p.company_id as string))];
  const { data: companies } =
    companyIds.length > 0
      ? await admin
          .from("companies")
          .select("id, company_name, location, is_new_company, evaluation_enabled, company_score")
          .in("id", companyIds)
      : {
          data: [] as {
            id: string;
            company_name: string;
            location: string | null;
            is_new_company: boolean | null;
            evaluation_enabled: boolean | null;
            company_score: number | null;
          }[],
        };

  const companyById = new Map(
    (companies ?? []).map((c) => {
      const level = deriveCompanyLevel(c);
      return [
        c.id,
        { ...c, company_level: level as CompanyLevel | null },
      ] as const;
    })
  );
  const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.company_name]));

  const scored: InternshipMatchResult[] = [];

  for (const p of rows) {
    if (!isInternshipOpenForApplications(p as { is_active?: boolean | null; application_deadline?: string | null })) {
      continue;
    }
    const pid = p.id as string;
    const companyId = p.company_id as string;
    const match = scoreInternshipMatch({
      position: {
        id: pid,
        title: p.title as string | null,
        embedding: p.embedding,
        company_id: companyId,
        requirements: p.requirements != null ? String(p.requirements) : null,
        description: p.description != null ? String(p.description) : null,
        location: p.location != null ? String(p.location) : null,
        additional_notes: p.additional_notes != null ? String(p.additional_notes) : null,
        is_active: p.is_active as boolean | null,
      },
      company: companyById.get(companyId),
      companyName: String(companyNameById.get(companyId) ?? ""),
      studentVec,
      studentSources,
      locationPrefs,
      t,
    });
    if (match) scored.push(match);
  }

  scored.sort((a, b) => b.recommendation_score - a.recommendation_score);

  const cacheRecommendations = scored.slice(0, 50);
  await admin
    .from("student_recommendation_cache")
    .upsert(
      {
        student_id: student.id,
        student_embedding_version: studentEmbeddingVersion,
        location_prefs_key: cacheKey,
        recommendations: cacheRecommendations,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,student_embedding_version,location_prefs_key" }
    );

  return NextResponse.json({
    ok: true,
    location_prefs: locationPrefs,
    recommendations: scored.slice(0, limit),
  });
}

