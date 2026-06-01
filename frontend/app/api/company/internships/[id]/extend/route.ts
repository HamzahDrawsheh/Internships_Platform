import { NextResponse } from "next/server";

import {
  isApplicationDeadlinePassed,
  todayIsoDate,
  validateApplicationDeadline,
} from "@/lib/internships/application-deadline";
import { normalizeDateInputValue } from "@/lib/internships/dates";
import { suggestExtendedApplicationDeadline } from "@/lib/internships/extend-listing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ExtendBody = {
  application_deadline?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: positionId } = await context.params;
    if (!positionId) {
      return NextResponse.json({ error: "Invalid internship id." }, { status: 400 });
    }

    let body: ExtendBody = {};
    try {
      const text = await request.text();
      if (text.trim()) body = JSON.parse(text) as ExtendBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const supabaseAuth = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "company") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: company } = await supabaseAuth
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!company) {
      return NextResponse.json({ error: "Company profile not found." }, { status: 404 });
    }

    const { data: position, error: posError } = await supabaseAuth
      .from("internship_positions")
      .select("id, start_date, application_deadline, is_active")
      .eq("id", positionId)
      .eq("company_id", company.id)
      .maybeSingle();

    if (posError || !position) {
      return NextResponse.json({ error: "Internship not found." }, { status: 404 });
    }

    const wasExpired = isApplicationDeadlinePassed(position.application_deadline);
    if (!wasExpired) {
      return NextResponse.json(
        { error: "This listing is still open for applications. Edit the deadline instead." },
        { status: 400 }
      );
    }

    const startDate = normalizeDateInputValue(position.start_date);
    const newDeadline =
      normalizeDateInputValue(body.application_deadline) ||
      suggestExtendedApplicationDeadline(startDate);

    const today = todayIsoDate();
    if (newDeadline < today) {
      return NextResponse.json(
        { error: "New application deadline must be today or later." },
        { status: 400 }
      );
    }

    const deadlineError = validateApplicationDeadline(newDeadline, startDate || newDeadline);
    if (deadlineError) {
      return NextResponse.json({ error: deadlineError }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("internship_positions")
      .update({
        application_deadline: newDeadline,
        is_active: true,
      })
      .eq("id", positionId)
      .eq("company_id", company.id);

    if (updateError) {
      console.error("company internship extend:", updateError);
      return NextResponse.json({ error: "Failed to extend application period." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      application_deadline: newDeadline,
    });
  } catch (error) {
    console.error("company internship extend error:", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
