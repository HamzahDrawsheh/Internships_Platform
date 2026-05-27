import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildCombinedReportText,
  buildReportExtractionPrompt,
  MONTHLY_REPORT_TABLE,
  parseTaskToSkillAiResponse,
  TASK_TO_SKILL_SYSTEM_PROMPT,
  WEEKLY_REPORT_TABLE,
  type StudentReportSkillRow,
  type TaskToSkillLocale,
} from "@/lib/ai/task-to-skill";
import { toStringArray } from "@/lib/ai/cover-letter-context";
import { formatPostgrestError, isMissingSchemaError } from "@/lib/postgrest-error";
import {
  consumeUserRateLimitSlot,
  RATE_LIMIT_BUCKET_TASK_TO_SKILL,
} from "@/lib/server/in-memory-user-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MODEL = process.env.OPENAI_TASK_TO_SKILL_MODEL ?? process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

type RequestBody = {
  reportId?: string;
  report_id?: string;
  locale?: TaskToSkillLocale;
  /** When true, delete prior ai_task_mapper skills for this report before inserting. */
  reanalyze?: boolean;
};

type ApiSuccess = {
  success: true;
  ok: true;
  skills: StudentReportSkillRow[];
  summary: string;
  message?: string;
};

function jsonSuccess(payload: Omit<ApiSuccess, "success" | "ok">, status = 200) {
  return NextResponse.json({ success: true, ok: true, ...payload }, { status });
}

function jsonFailure(error: string, status = 400) {
  return NextResponse.json({ success: false, ok: false, error }, { status });
}

function trimText(value: unknown, maxLen = 8000): string {
  if (value == null) return "";
  const s = String(value).replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

/** Statuses after student has submitted Part I (or revision resubmit). */
const EXTRACTABLE_REPORT_STATUSES = new Set([
  "pending_employer",
  "pending_supervisor",
  "approved",
  "rejected",
  "overdue",
]);

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return jsonFailure("AI is not configured on the server (OPENAI_API_KEY).", 503);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return jsonFailure("Server error.", 500);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonFailure("You must be signed in.", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return jsonFailure("Could not load profile.", 500);
  }

  if (profile?.role !== "student") {
    return jsonFailure("Only students can extract report skills.", 403);
  }

  if (!(await consumeUserRateLimitSlot(user.id, RATE_LIMIT_BUCKET_TASK_TO_SKILL))) {
    return jsonFailure("Too many requests. Please wait a minute and try again.", 429);
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonFailure("Invalid JSON body.", 400);
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[api/ai/task-to-skill] request body:", body);
  }

  const reportId =
    (typeof body.reportId === "string" ? body.reportId.trim() : "") ||
    (typeof body.report_id === "string" ? body.report_id.trim() : "");

  if (process.env.NODE_ENV === "development") {
    console.log("[api/ai/task-to-skill] Report ID received:", reportId);
    console.log("[api/ai/task-to-skill] Report table used:", MONTHLY_REPORT_TABLE);
  }

  if (!reportId) {
    return jsonFailure("report_id is required.", 400);
  }

  const locale: TaskToSkillLocale = body.locale === "ar" ? "ar" : "en";

  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (studentError || !studentRow?.id) {
    return jsonFailure("Student profile not found.", 404);
  }

  const { data: report, error: reportError } = await supabase
    .from(MONTHLY_REPORT_TABLE)
    .select("id, internship_id, month_number, assignments, work_summary, status, student_submission_date")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    console.error("[api/ai/task-to-skill] report fetch:", formatPostgrestError(reportError));
    return jsonFailure(`Could not load report: ${formatPostgrestError(reportError)}`, 500);
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[api/ai/task-to-skill] Fetched report:", report);
  }

  if (!report?.id) {
    return jsonFailure("Report not found.", 404);
  }

  const { data: internship, error: internshipError } = await supabase
    .from("internships")
    .select("id, student_id, companies(company_name)")
    .eq("id", report.internship_id)
    .maybeSingle();

  if (internshipError) {
    return jsonFailure("Could not verify internship ownership.", 500);
  }

  if (!internship || internship.student_id !== studentRow.id) {
    return jsonFailure("You do not have access to this report.", 403);
  }

  const hasSubmitted =
    Boolean(report.student_submission_date) || EXTRACTABLE_REPORT_STATUSES.has(report.status);

  if (!hasSubmitted) {
    return jsonFailure("Submit the report before extracting skills.", 400);
  }

  const { data: weeks, error: weeksError } = await supabase
    .from(WEEKLY_REPORT_TABLE)
    .select("week_number, description")
    .eq("monthly_report_id", report.id)
    .order("week_number");

  if (weeksError) {
    console.error("[api/ai/task-to-skill] weekly fetch:", formatPostgrestError(weeksError));
  }

  const reportText = buildCombinedReportText(
    { assignments: report.assignments, work_summary: report.work_summary },
    weeks ?? []
  );

  if (process.env.NODE_ENV === "development") {
    console.log("[api/ai/task-to-skill] Combined report text:", reportText);
    console.log("[api/ai/task-to-skill] Combined report text length:", reportText.length);
  }

  if (!reportText.trim()) {
    return jsonFailure("No report content available for skill extraction.", 400);
  }

  const companyNested = internship.companies as { company_name?: string } | null;
  const companyName = trimText(companyNested?.company_name, 200) || "the company";

  const { data: additional } = await supabase
    .from("student_additional_info")
    .select("technical_skills, soft_skills")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: legacyStudent } = await supabase
    .from("students")
    .select("skills")
    .eq("user_id", user.id)
    .maybeSingle();

  const existingSkills = [
    ...toStringArray(additional?.technical_skills),
    ...toStringArray(additional?.soft_skills),
    ...(legacyStudent?.skills ? legacyStudent.skills.split(",").map((s: string) => s.trim()) : []),
  ].filter(Boolean);

  const reportContent = {
    reportTitle: `Month ${report.month_number} Training Report`,
    assignments: trimText(report.assignments),
    workSummary: trimText(report.work_summary),
    weeklyActivities: (weeks ?? [])
      .map((w) => `Week ${w.week_number}: ${trimText(w.description, 1500)}`)
      .filter((line) => line.replace(/^Week \d+:\s*$/, "").length > 0)
      .join("\n"),
    companyName,
    internshipLabel: `Internship at ${companyName}`,
    existingSkills: [...new Set(existingSkills)],
    locale,
  };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let extracted;
  let aiRawText = "";
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TASK_TO_SKILL_SYSTEM_PROMPT },
        {
          role: "user",
          content: `${buildReportExtractionPrompt(reportContent)}\n\n=== Full report text ===\n${reportText}`,
        },
      ],
    });

    aiRawText = completion.choices[0]?.message?.content?.trim() ?? "";
    if (process.env.NODE_ENV === "development") {
      console.log("[api/ai/task-to-skill] AI raw response:", aiRawText);
    }

    if (!aiRawText) {
      return jsonFailure("AI returned an empty response.", 502);
    }

    extracted = parseTaskToSkillAiResponse(aiRawText, {
      logRejections: process.env.NODE_ENV === "development",
    });
    if (process.env.NODE_ENV === "development") {
      console.log("[api/ai/task-to-skill] Parsed skills:", extracted.skills);
      console.log("[api/ai/task-to-skill] Filtered skills count:", extracted.skills.length);
    }
  } catch (e) {
    console.error("[api/ai/task-to-skill] OpenAI/parse error:", e);
    if (process.env.NODE_ENV === "development" && aiRawText) {
      console.error("[api/ai/task-to-skill] Failed to parse raw response:", aiRawText);
    }
    const message = e instanceof Error ? e.message : "AI skill extraction failed.";
    return jsonFailure(message, 502);
  }

  const reanalyze = body.reanalyze === true;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[api/ai/task-to-skill] admin client:", e);
    return jsonFailure("Server configuration error.", 500);
  }

  if (reanalyze) {
    const { error: deleteError } = await admin
      .from("student_report_skills")
      .delete()
      .eq("report_id", report.id)
      .eq("source", "ai_task_mapper");

    if (deleteError) {
      console.error("[api/ai/task-to-skill] reanalyze delete:", formatPostgrestError(deleteError));
      return jsonFailure(`Could not clear prior skills: ${formatPostgrestError(deleteError)}`, 500);
    }
  }

  if (extracted.skills.length === 0) {
    return jsonSuccess({
      skills: [],
      summary: extracted.summary,
      message: "no_supported_skills",
    });
  }

  const rowsToInsert = extracted.skills.map((s) => ({
    student_id: studentRow.id,
    report_id: report.id,
    skill_name: s.skill_name,
    skill_category: s.skill_category,
    evidence_text: s.evidence_text,
    confidence_score: s.confidence_score,
    source: "ai_task_mapper",
    approved_by_student: true,
    added_to_cv: false,
    approved_by_supervisor: false,
  }));

  let rowsToSave = rowsToInsert;

  if (!reanalyze) {
    const { data: existingRows, error: existingError } = await admin
      .from("student_report_skills")
      .select("skill_name")
      .eq("report_id", report.id);

    if (existingError) {
      console.error("[api/ai/task-to-skill] existing skills fetch:", formatPostgrestError(existingError));
      if (isMissingSchemaError(existingError)) {
        return jsonFailure(
          "student_report_skills table is missing. Run Supabase migration 20260526120000_student_report_skills.sql.",
          503
        );
      }
      return jsonFailure(`Could not load existing skills: ${formatPostgrestError(existingError)}`, 500);
    }

    const existingKeys = new Set(
      (existingRows ?? []).map((r) => String(r.skill_name).trim().toLowerCase())
    );

    rowsToSave = rowsToInsert.filter(
      (r) => !existingKeys.has(r.skill_name.trim().toLowerCase())
    );
  }

  let savedSkills: StudentReportSkillRow[] = [];

  if (rowsToSave.length > 0) {
    const { data: inserted, error: insertError } = await admin
      .from("student_report_skills")
      .insert(rowsToSave)
      .select("*");

    if (process.env.NODE_ENV === "development") {
      console.log("[api/ai/task-to-skill] Insert saved skills result:", {
        error: insertError,
        count: rowsToSave.length,
        inserted: inserted?.length ?? 0,
      });
    }

    if (insertError) {
      console.error("[api/ai/task-to-skill] insert error:", formatPostgrestError(insertError));
      if (isMissingSchemaError(insertError)) {
        return jsonFailure(
          "student_report_skills table is missing. Run Supabase migration 20260526120000_student_report_skills.sql.",
          503
        );
      }
      return jsonFailure(`Could not save extracted skills: ${formatPostgrestError(insertError)}`, 500);
    }

    savedSkills = (inserted ?? []) as StudentReportSkillRow[];
  }

  const { data: allForReport, error: fetchError } = await admin
    .from("student_report_skills")
    .select("*")
    .eq("report_id", report.id)
    .order("created_at", { ascending: true });

  if (fetchError) {
    return jsonFailure(`Could not load saved skills: ${formatPostgrestError(fetchError)}`, 500);
  }

  const finalSkills =
    (allForReport?.length ? allForReport : savedSkills) as StudentReportSkillRow[];

  if (process.env.NODE_ENV === "development") {
    console.log("[api/ai/task-to-skill] Returning skills count:", finalSkills.length);
  }

  return jsonSuccess({
    skills: finalSkills,
    summary: extracted.summary,
  });
}
