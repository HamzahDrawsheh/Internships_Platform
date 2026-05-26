import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { skillId } = await context.params;
  const id = skillId?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "skill_id_required" }, { status: 400 });
  }

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

  const { data: skillRow, error: skillError } = await supabase
    .from("student_report_skills")
    .select("id, student_id")
    .eq("id", id)
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

  const { error: deleteError } = await supabase.from("student_report_skills").delete().eq("id", id);

  if (deleteError) {
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
