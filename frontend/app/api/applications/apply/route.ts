import { NextResponse } from "next/server";

import { isInternshipOpenForApplications } from "@/lib/internships/application-deadline";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { formatPostgrestError } from "@/lib/postgrest-error";
import { createClient } from "@/lib/supabase/server";

type ApplyBody = {
  positionId?: string;
  message?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ApplyBody;
    const positionId = typeof body.positionId === "string" ? body.positionId.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim() || null : null;

    if (!positionId) {
      return NextResponse.json({ ok: false, error: "positionId is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Please log in to apply." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: formatPostgrestError(profileError) },
        { status: 400 }
      );
    }

    if (profile?.role && profile.role !== "student") {
      return NextResponse.json(
        { ok: false, error: "Only students can apply to internships." },
        { status: 403 }
      );
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (studentError) {
      return NextResponse.json(
        { ok: false, error: formatPostgrestError(studentError) },
        { status: 400 }
      );
    }

    if (!student?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Student profile not found. Please complete your student profile first.",
        },
        { status: 400 }
      );
    }

    const { data: position, error: positionError } = await supabase
      .from("internship_positions")
      .select("id, title, company_id, is_active, application_deadline")
      .eq("id", positionId)
      .maybeSingle();

    if (positionError) {
      return NextResponse.json(
        { ok: false, error: formatPostgrestError(positionError) },
        { status: 400 }
      );
    }

    if (!position) {
      return NextResponse.json({ ok: false, error: "Internship not found." }, { status: 404 });
    }

    if (!isInternshipOpenForApplications(position)) {
      return NextResponse.json(
        { ok: false, error: "This internship is no longer accepting applications." },
        { status: 400 }
      );
    }

    const { data: existingApp } = await supabase
      .from("applications")
      .select("id, status")
      .eq("student_id", student.id)
      .eq("position_id", positionId)
      .maybeSingle();

    if (existingApp?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "You already applied to this internship.",
          code: "already_applied",
          applicationId: existingApp.id,
          status: existingApp.status,
        },
        { status: 409 }
      );
    }

    const { data: isEnrolled, error: enrolledError } = await supabase.rpc(
      "student_has_committed_internship",
      { p_student_id: student.id }
    );

    if (enrolledError) {
      return NextResponse.json(
        { ok: false, error: formatPostgrestError(enrolledError) },
        { status: 400 }
      );
    }

    if (isEnrolled === true) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "You are already enrolled in a training opportunity. You cannot apply to other internships until that placement is completed.",
          code: "already_enrolled",
        },
        { status: 409 }
      );
    }

    const { data: insertedApp, error: insertError } = await supabase
      .from("applications")
      .insert({
        student_id: student.id,
        position_id: positionId,
        message,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { ok: false, error: "You already applied to this internship.", code: "already_applied" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: formatPostgrestError(insertError) },
        { status: 400 }
      );
    }

    const { data: company } = await supabase
      .from("companies")
      .select("user_id, company_name")
      .eq("id", position.company_id)
      .maybeSingle();

    let notificationWarning: string | undefined;

    if (company?.user_id && insertedApp?.id) {
      const applicantName =
        profile?.full_name?.trim() ||
        user.email?.split("@")[0] ||
        "A student";
      const internshipTitle = position.title?.trim() || "your internship";

      const notifyResult = await dispatchNotification({
        recipientUserId: company.user_id,
        title: "New application",
        message: `${applicantName} applied to “${internshipTitle}”.`,
        type: "new_application",
        relatedApplicationId: insertedApp.id,
        linkPath: `/company/internships/${positionId}/applications`,
      });

      if (!notifyResult.ok) {
        console.error("[api/applications/apply] notify company:", notifyResult.error);
        notificationWarning = notifyResult.error;
      }
    }

    return NextResponse.json({
      ok: true,
      applicationId: insertedApp.id,
      status: "pending",
      notificationWarning,
    });
  } catch (error) {
    console.error("[api/applications/apply] unexpected:", error);
    return NextResponse.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
