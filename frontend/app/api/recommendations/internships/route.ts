import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cosineSimilarity, parsePgVector } from "@/lib/ai/vector-utils";

type RecommendationRow = {
  internship_id: string;
  title: string;
  company_name: string;
  similarity_score: number;
  match_percentage: number;
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
    .select("id, embedding")
    .eq("user_id", user.id)
    .maybeSingle();

  if (studentError) {
    return NextResponse.json({ ok: false, error: "student_lookup_failed" }, { status: 500 });
  }

  const studentVec = parsePgVector(student?.embedding ?? null);
  if (!student?.id || !studentVec) {
    return NextResponse.json({ ok: true, recommendations: [] as RecommendationRow[] });
  }

  const { data: positions, error: positionsError } = await admin
    .from("internship_positions")
    .select("id, title, embedding, company_id, is_active")
    .eq("is_active", true);

  if (positionsError) {
    return NextResponse.json({ ok: false, error: positionsError.message }, { status: 500 });
  }

  const rows = positions ?? [];
  const companyIds = [...new Set(rows.map((p) => p.company_id as string))];
  const { data: companies } =
    companyIds.length > 0
      ? await admin.from("companies").select("id, company_name").in("id", companyIds)
      : { data: [] as { id: string; company_name: string }[] };

  const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.company_name]));

  const scored: RecommendationRow[] = [];

  for (const p of rows) {
    const pid = p.id as string;
    const emb = parsePgVector(p.embedding ?? null);
    if (!emb) {
      continue;
    }
    const sim = cosineSimilarity(studentVec, emb);
    const similarityScore = Math.max(0, Math.min(1, sim));
    scored.push({
      internship_id: pid,
      title: String(p.title ?? ""),
      company_name: String(companyNameById.get(p.company_id as string) ?? ""),
      similarity_score: similarityScore,
      match_percentage: Math.round(similarityScore * 10000) / 100,
    });
  }

  scored.sort((a, b) => b.similarity_score - a.similarity_score);

  return NextResponse.json({
    ok: true,
    recommendations: scored.slice(0, limit),
  });
}
