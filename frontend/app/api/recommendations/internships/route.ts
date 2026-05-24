import { NextResponse } from "next/server";
import { buildMatchInsights, type MatchInsights } from "@/lib/ai/match-insights";
import { analyzeSkillGap, type SkillGapAnalysis } from "@/lib/skill-match";
import { blendRecommendationScore } from "@/lib/companies/evaluation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cosineSimilarity, parsePgVector } from "@/lib/ai/vector-utils";

/** Ranked row before optional enrichment (same ordering as historical API fields). */
type ScoredRecommendationRow = {
  internship_id: string;
  title: string;
  company_name: string;
  company_id: string;
  similarity_score: number;
  match_percentage: number;
  recommendation_score: number;
  company_confidence: "high" | "medium" | "low";
};

type SkillGapPayload = Pick<
  SkillGapAnalysis,
  "matchedSkills" | "missingSkills" | "missingSkillsCount" | "hasDetectableInternshipSkills"
>;

type RecommendationRow = ScoredRecommendationRow & {
  match_insights: MatchInsights;
  skill_gap: SkillGapPayload;
};

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

  const admin = createAdminClient();

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, embedding, skills")
    .eq("user_id", user.id)
    .maybeSingle();

  if (studentError) {
    return NextResponse.json({ ok: false, error: "student_lookup_failed" }, { status: 500 });
  }

  const studentVec = parsePgVector(student?.embedding ?? null);
  if (!student?.id || !studentVec) {
    return NextResponse.json({ ok: true, recommendations: [] as RecommendationRow[] });
  }

  // One round-trip for extra profile fields used by rule-based insights; parallel with positions load.
  const [{ data: additional }, { data: positions, error: positionsError }] = await Promise.all([
    admin
      .from("student_additional_info")
      .select("technical_skills, soft_skills, taken_courses, custom_courses, preferred_field")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("internship_positions")
      .select("id, title, embedding, company_id, is_active")
      .eq("is_active", true),
  ]);

  if (positionsError) {
    return NextResponse.json({ ok: false, error: positionsError.message }, { status: 500 });
  }

  const studentSources = {
    skills: student.skills ?? null,
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
          .select("id, company_name, is_new_company, evaluation_enabled, company_score")
          .in("id", companyIds)
      : { data: [] as { id: string; company_name: string; is_new_company: boolean | null; evaluation_enabled: boolean | null; company_score: number | null }[] };

  const companyById = new Map((companies ?? []).map((c) => [c.id, c]));
  const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.company_name]));

  const scored: ScoredRecommendationRow[] = [];

  for (const p of rows) {
    const pid = p.id as string;
    const companyId = p.company_id as string;
    const emb = parsePgVector(p.embedding ?? null);
    if (!emb) {
      continue;
    }
    const sim = cosineSimilarity(studentVec, emb);
    const similarityScore = Math.max(0, Math.min(1, sim));
    const blended = blendRecommendationScore(similarityScore, companyById.get(companyId));
    scored.push({
      internship_id: pid,
      company_id: companyId,
      title: String(p.title ?? ""),
      company_name: String(companyNameById.get(companyId) ?? ""),
      similarity_score: similarityScore,
      match_percentage: Math.round(similarityScore * 10000) / 100,
      recommendation_score: Math.round(blended.rankScore * 10000) / 100,
      company_confidence: blended.confidence,
    });
  }

  scored.sort((a, b) => b.recommendation_score - a.recommendation_score);

  const top = scored.slice(0, limit);
  const topIds = top.map((r) => r.internship_id);

  const detailById = new Map<string, { requirements: string | null; description: string | null }>();
  if (topIds.length > 0) {
    const { data: detailRows } = await admin
      .from("internship_positions")
      .select("id, requirements, description")
      .in("id", topIds);

    for (const d of detailRows ?? []) {
      const id = d.id as string;
      detailById.set(id, {
        requirements: d.requirements != null ? String(d.requirements) : null,
        description: d.description != null ? String(d.description) : null,
      });
    }
  }

  const recommendations: RecommendationRow[] = top.map((row) => {
    const detail = detailById.get(row.internship_id);
    const internshipSource = {
      requirements: detail?.requirements ?? null,
      description: detail?.description ?? null,
    };
    const gap = analyzeSkillGap(studentSources, internshipSource);
    return {
      ...row,
      match_insights: buildMatchInsights({
        studentSources,
        internshipTitle: row.title,
        internshipRequirements: detail?.requirements ?? null,
        internshipDescription: detail?.description ?? null,
        matchPercentage: row.match_percentage,
      }),
      skill_gap: {
        matchedSkills: gap.matchedSkills,
        missingSkills: gap.missingSkills,
        missingSkillsCount: gap.missingSkillsCount,
        hasDetectableInternshipSkills: gap.hasDetectableInternshipSkills,
      },
    };
  });

  return NextResponse.json({
    ok: true,
    recommendations,
  });
}
