import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type CommitBody = {
  applicationId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CommitBody;
    const applicationId =
      typeof body.applicationId === "string" ? body.applicationId.trim() : "";

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: "applicationId is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Please log in." }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("student_confirm_application_commitment", {
      p_application_id: applicationId,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const result = data as {
      ok?: boolean;
      error?: string;
      withdrawn_count?: number;
      internship_title?: string;
    };

    if (!result?.ok) {
      const code = result?.error ?? "commit_failed";
      const status =
        code === "not_authenticated"
          ? 401
          : code === "application_not_found"
            ? 404
            : code === "deadline_passed" || code === "invalid_status" || code === "already_committed"
              ? 409
              : 400;
      return NextResponse.json({ ok: false, error: code }, { status });
    }

    try {
      const cronSecret = process.env.CRON_SECRET?.trim();
      if (cronSecret) {
        await fetch(new URL("/api/notifications/process-email-queue", request.url), {
          method: "POST",
          headers: { "x-cron-secret": cronSecret },
        });
      }
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      ok: true,
      withdrawnCount: result.withdrawn_count ?? 0,
      internshipTitle: result.internship_title ?? null,
    });
  } catch (error) {
    console.error("[api/applications/commit] unexpected:", error);
    return NextResponse.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
