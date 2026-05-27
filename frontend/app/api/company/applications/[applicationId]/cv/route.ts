import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "student-cvs";
const SIGNED_URL_TTL_SEC = 300;

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    let supabaseAuth;
    try {
      supabaseAuth = await createClient();
    } catch {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { applicationId } = await context.params;
    const trimmedId = applicationId?.trim() ?? "";
    if (!trimmedId) {
      return NextResponse.json({ error: "Application id is required" }, { status: 400 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "Unable to verify permissions" }, { status: 500 });
    }

    if (profile?.role !== "company") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: company, error: companyError } = await supabaseAuth
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (companyError) {
      return NextResponse.json({ error: "Unable to verify company" }, { status: 500 });
    }

    if (!company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: application, error: applicationError } = await supabaseAuth
      .from("applications")
      .select("id, student_id, position_id")
      .eq("id", trimmedId)
      .maybeSingle();

    if (applicationError) {
      return NextResponse.json({ error: "Unable to load application" }, { status: 500 });
    }

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const { data: position, error: positionError } = await supabaseAuth
      .from("internship_positions")
      .select("id, company_id")
      .eq("id", application.position_id)
      .maybeSingle();

    if (positionError) {
      return NextResponse.json({ error: "Unable to verify internship" }, { status: 500 });
    }

    if (!position || position.company_id !== company.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: studentCvRow, error: studentCvError } = await supabaseAuth
      .from("students")
      .select("cv_path")
      .eq("id", application.student_id)
      .single();

    if (studentCvError) {
      console.error("student cv_path fetch error:", studentCvError);
      return NextResponse.json({ error: "student_cv_fetch_failed" }, { status: 500 });
    }

    const cvPath = studentCvRow?.cv_path?.trim();
    if (!cvPath) {
      return NextResponse.json(
        { error: "No CV uploaded", code: "no_cv" },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      return NextResponse.json({ error: "server_storage_config_missing" }, { status: 500 });
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { data: signed, error: signError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(cvPath, SIGNED_URL_TTL_SEC);

    if (signError || !signed?.signedUrl) {
      const message = signError?.message ?? "Could not generate download link";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SEC });
  } catch (error) {
    console.error("CV API ERROR:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
