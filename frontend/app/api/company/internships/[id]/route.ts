import { NextResponse } from "next/server";

import { validateApplicationDeadline } from "@/lib/internships/application-deadline";
import { buildInternshipScheduleFields, validateInternshipDates } from "@/lib/internships/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PatchBody = {
  title?: string;
  description?: string;
  requirements?: string | null;
  location?: string | null;
  additional_notes?: string | null;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  application_deadline?: string;
};

/** Updates listing fields only. Trainee schedules stay on each application (commit time). */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: positionId } = await context.params;
    if (!positionId) {
      return NextResponse.json({ error: "Invalid internship id." }, { status: 400 });
    }

    let body: PatchBody;
    try {
      body = (await request.json()) as PatchBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    const startDate = typeof body.start_date === "string" ? body.start_date.trim() : "";
    const endDate = typeof body.end_date === "string" ? body.end_date.trim() : "";
    const applicationDeadline =
      typeof body.application_deadline === "string" ? body.application_deadline.trim() : "";

    const dateError = validateInternshipDates(startDate, endDate);
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    const deadlineError = validateApplicationDeadline(
      applicationDeadline || startDate,
      startDate
    );
    if (deadlineError) {
      return NextResponse.json({ error: deadlineError }, { status: 400 });
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

    const { data: position } = await supabaseAuth
      .from("internship_positions")
      .select("id")
      .eq("id", positionId)
      .eq("company_id", company.id)
      .maybeSingle();

    if (!position) {
      return NextResponse.json({ error: "Internship not found." }, { status: 404 });
    }

    const schedule = buildInternshipScheduleFields(
      startDate,
      endDate,
      applicationDeadline || startDate
    );

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("internship_positions")
      .update({
        title,
        description,
        requirements: body.requirements ?? null,
        additional_notes: body.additional_notes ?? null,
        location: body.location ?? null,
        is_active: Boolean(body.is_active),
        ...schedule,
      })
      .eq("id", positionId)
      .eq("company_id", company.id);

    if (updateError) {
      console.error("company internship patch position:", updateError);
      return NextResponse.json({ error: "Failed to update internship." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("company internship PATCH error:", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
