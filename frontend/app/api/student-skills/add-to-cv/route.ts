import { NextResponse } from "next/server";
import { mergeTechnicalSkill } from "@/lib/skills/technical-skills-merge";
import { toStringArray } from "@/lib/ai/cover-letter-context";
import { createClient } from "@/lib/supabase/server";

type RequestBody = {
  skillId?: string;
};

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "student") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const skillId = typeof body.skillId === "string" ? body.skillId.trim() : "";
  if (!skillId) {
    return NextResponse.json({ ok: false, error: "skill_id_required" }, { status: 400 });
  }

  const { data: skillRow, error: skillError } = await supabase
    .from("student_report_skills")
    .select("id, student_id, skill_name, added_to_cv")
    .eq("id", skillId)
    .maybeSingle();

  if (skillError) {
    return NextResponse.json({ ok: false, error: "skill_error" }, { status: 500 });
  }

  if (!skillRow) {
    return NextResponse.json({ ok: false, error: "skill_not_found" }, { status: 404 });
  }

  const { data: studentOwner } = await supabase
    .from("students")
    .select("user_id")
    .eq("id", skillRow.student_id)
    .maybeSingle();

  if (studentOwner?.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const skillName = skillRow.skill_name.trim();
  if (!skillName) {
    return NextResponse.json({ ok: false, error: "invalid_skill" }, { status: 400 });
  }

  const { data: additional, error: additionalError } = await supabase
    .from("student_additional_info")
    .select("technical_skills")
    .eq("user_id", user.id)
    .maybeSingle();

  if (additionalError) {
    return NextResponse.json({ ok: false, error: "profile_error" }, { status: 500 });
  }

  const currentSkills = toStringArray(additional?.technical_skills);
  const mergedSkills = mergeTechnicalSkill(currentSkills, skillName);

  const { error: upsertError } = await supabase.from("student_additional_info").upsert(
    {
      user_id: user.id,
      technical_skills: mergedSkills,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    console.error("[api/student-skills/add-to-cv] upsert error:", upsertError);
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  const { error: markError } = await supabase
    .from("student_report_skills")
    .update({ added_to_cv: true })
    .eq("id", skillId);

  if (markError) {
    return NextResponse.json({ ok: false, error: "mark_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    skillName,
    addedToCv: true,
    alreadyInProfile: currentSkills.length === mergedSkills.length,
  });
}
