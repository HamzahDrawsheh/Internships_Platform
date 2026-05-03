import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateInternshipEmbeddingByPositionId,
  generateStudentEmbeddingByStudentId,
} from "@/lib/ai/embeddings";

type Body = {
  scope?: string;
  internshipId?: string;
};

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ ok: false, error: "ai_not_configured" }, { status: 503 });
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

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const scope = body.scope === "internship" ? "internship" : "student";

  try {
    if (scope === "student") {
      const { data: profile, error: profileError } = await supabase
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

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentError) {
        return NextResponse.json({ ok: false, error: "student_lookup_failed" }, { status: 500 });
      }
      if (!student?.id) {
        return NextResponse.json({ ok: false, error: "no_student_row" }, { status: 400 });
      }

      const result = await generateStudentEmbeddingByStudentId(student.id);
      return NextResponse.json({ ok: true, scope: "student", ...result });
    }

    const internshipId = typeof body.internshipId === "string" ? body.internshipId.trim() : "";
    if (!internshipId) {
      return NextResponse.json({ ok: false, error: "internship_id_required" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ ok: false, error: "profile_error" }, { status: 500 });
    }
    if (profile?.role !== "company") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: company, error: companyError } = await admin
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (companyError || !company?.id) {
      return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 403 });
    }

    const { data: position, error: positionError } = await admin
      .from("internship_positions")
      .select("id, company_id")
      .eq("id", internshipId)
      .maybeSingle();

    if (positionError) {
      return NextResponse.json({ ok: false, error: "position_lookup_failed" }, { status: 500 });
    }
    if (!position || position.company_id !== company.id) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const result = await generateInternshipEmbeddingByPositionId(internshipId);
    return NextResponse.json({ ok: true, scope: "internship", ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "embedding_refresh_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
