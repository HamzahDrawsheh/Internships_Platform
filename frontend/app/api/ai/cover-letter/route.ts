import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildContextUsedSummary,
  buildCoverLetterUserPrompt,
  COVER_LETTER_SYSTEM_PROMPT,
  finalizeCoverLetterOutput,
  isProfileIncomplete,
  parseStudentPreferences,
  toStringArray,
  type CoverLetterLocale,
  type CoverLetterStudentContext,
} from "@/lib/ai/cover-letter-context";
import {
  consumeUserRateLimitSlot,
  RATE_LIMIT_BUCKET_COVER_LETTER,
} from "@/lib/server/in-memory-user-rate-limit";
import { createClient } from "@/lib/supabase/server";

const MODEL = process.env.OPENAI_COVER_LETTER_MODEL ?? process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

type CoverLetterBody = {
  positionId?: string;
  locale?: CoverLetterLocale;
};

function trimText(value: unknown, maxLen = 4000): string {
  if (value == null) return "";
  const s = String(value).replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: "profile_error" }, { status: 500 });
  }

  if (profile?.role !== "student") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (!(await consumeUserRateLimitSlot(user.id, RATE_LIMIT_BUCKET_COVER_LETTER))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: CoverLetterBody;
  try {
    body = (await request.json()) as CoverLetterBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const positionId = typeof body.positionId === "string" ? body.positionId.trim() : "";
  if (!positionId) {
    return NextResponse.json({ ok: false, error: "position_id_required" }, { status: 400 });
  }

  const locale: CoverLetterLocale = body.locale === "ar" ? "ar" : "en";

  const { data: position, error: positionError } = await supabase
    .from("internship_positions")
    .select("id, title, description, requirements, additional_notes, company_id, is_active")
    .eq("id", positionId)
    .maybeSingle();

  if (positionError) {
    return NextResponse.json({ ok: false, error: "position_error" }, { status: 500 });
  }

  if (!position?.id) {
    return NextResponse.json({ ok: false, error: "position_not_found" }, { status: 404 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("company_name")
    .eq("id", position.company_id)
    .maybeSingle();

  const { data: studentRow } = await supabase
    .from("students")
    .select("university, department, major, skills, preferences")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: additional } = await supabase
    .from("student_additional_info")
    .select("gpa, technical_skills, soft_skills, taken_courses")
    .eq("user_id", user.id)
    .maybeSingle();

  const prefParsed = parseStudentPreferences(studentRow?.preferences ?? null);

  const studentContext: CoverLetterStudentContext = {
    fullName: trimText(profile?.full_name, 120),
    university: trimText(studentRow?.university, 200),
    major: trimText(studentRow?.major, 200),
    department: trimText(studentRow?.department, 200),
    academicYear: prefParsed.academicYear,
    gpa: additional?.gpa != null ? String(additional.gpa) : null,
    skillsFromProfile: trimText(studentRow?.skills, 500),
    technicalSkills: toStringArray(additional?.technical_skills),
    softSkills: toStringArray(additional?.soft_skills),
    courses: toStringArray(additional?.taken_courses),
    projects: prefParsed.projects,
    bioOrExperience: prefParsed.bio,
  };

  const internshipContext = {
    title: trimText(position.title, 300) || "Internship opportunity",
    companyName: trimText(company?.company_name, 200) || "the company",
    description: trimText(position.description),
    requirements: trimText(position.requirements),
    additionalNotes: trimText(position.additional_notes),
  };

  const contextUsed = buildContextUsedSummary(studentContext, internshipContext);
  const profileIncomplete = isProfileIncomplete(studentContext);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: COVER_LETTER_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildCoverLetterUserPrompt(studentContext, internshipContext, locale),
        },
      ],
    });

    const rawCoverLetter = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!rawCoverLetter) {
      return NextResponse.json({ ok: false, error: "empty_response" }, { status: 502 });
    }

    const coverLetter = finalizeCoverLetterOutput(rawCoverLetter, locale, studentContext.fullName);
    if (!coverLetter) {
      return NextResponse.json({ ok: false, error: "empty_response" }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      coverLetter,
      contextUsed,
      profileIncomplete,
    });
  } catch (e) {
    console.error("[api/ai/cover-letter] OpenAI error:", e);
    return NextResponse.json({ ok: false, error: "openai_failed" }, { status: 502 });
  }
}
