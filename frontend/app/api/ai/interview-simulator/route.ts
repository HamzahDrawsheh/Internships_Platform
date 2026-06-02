import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildInterviewEvaluatePrompt,
  buildInterviewInternshipContext,
  buildInterviewStartPrompt,
  buildInterviewStudentContext,
  INTERVIEW_ANSWER_MAX_LEN,
  INTERVIEW_PRIOR_QA_MAX,
  INTERVIEW_QUESTION_MAX_LEN,
  INTERVIEW_SIMULATOR_SYSTEM_PROMPT,
  parseInterviewEvaluateResponse,
  parseInterviewStartResponse,
  trimInterviewText,
  type InterviewPriorQa,
  type InterviewSimulatorLocale,
} from "@/lib/ai/interview-simulator";
import {
  consumeUserRateLimitSlot,
  RATE_LIMIT_BUCKET_INTERVIEW_SIMULATOR,
} from "@/lib/server/in-memory-user-rate-limit";
import { createClient } from "@/lib/supabase/server";

const MODEL =
  process.env.OPENAI_INTERVIEW_MODEL ?? process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

type InterviewBody = {
  action?: string;
  positionId?: string;
  locale?: InterviewSimulatorLocale;
  question?: string;
  answer?: string;
  questionNumber?: number;
  priorQa?: InterviewPriorQa[];
};

function parsePriorQa(value: unknown): InterviewPriorQa[] {
  if (!Array.isArray(value)) return [];
  const items: InterviewPriorQa[] = [];
  for (const item of value.slice(-INTERVIEW_PRIOR_QA_MAX)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const question = trimInterviewText(record.question, INTERVIEW_QUESTION_MAX_LEN);
    const answer = trimInterviewText(record.answer, INTERVIEW_ANSWER_MAX_LEN);
    if (!question || !answer) continue;
    const scoreRaw = record.score;
    const entry: InterviewPriorQa = { question, answer };
    if (typeof scoreRaw === "number" && Number.isFinite(scoreRaw)) {
      entry.score = Math.max(0, Math.min(10, Math.round(scoreRaw)));
    }
    items.push(entry);
  }
  return items;
}

async function loadInterviewContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  positionId: string
) {
  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select("id, university, department, major, skills, preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (studentError || !studentRow?.id) {
    return { error: "student_not_found" as const };
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id")
    .eq("student_id", studentRow.id)
    .eq("position_id", positionId)
    .maybeSingle();

  if (applicationError) {
    return { error: "application_error" as const };
  }

  if (!application?.id) {
    return { error: "application_required" as const };
  }

  const { data: position, error: positionError } = await supabase
    .from("internship_positions")
    .select("id, title, description, requirements, additional_notes, company_id")
    .eq("id", positionId)
    .maybeSingle();

  if (positionError) {
    return { error: "position_error" as const };
  }

  if (!position?.id) {
    return { error: "position_not_found" as const };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("company_name")
    .eq("id", position.company_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const { data: additional } = await supabase
    .from("student_additional_info")
    .select("technical_skills, soft_skills, taken_courses")
    .eq("user_id", userId)
    .maybeSingle();

  const student = buildInterviewStudentContext({
    fullName: trimInterviewText(profile?.full_name, 120),
    university: studentRow.university,
    major: studentRow.major,
    department: studentRow.department,
    skillsFromProfile: studentRow.skills,
    technicalSkills: additional?.technical_skills ?? [],
    softSkills: additional?.soft_skills ?? [],
    courses: additional?.taken_courses ?? [],
    preferencesRaw: studentRow.preferences,
  });

  const internship = buildInterviewInternshipContext({
    title: position.title,
    companyName: company?.company_name ?? "",
    description: position.description,
    requirements: position.requirements,
    additionalNotes: position.additional_notes,
  });

  return { student, internship };
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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: "profile_error" }, { status: 500 });
  }

  if (profile?.role !== "student") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (!(await consumeUserRateLimitSlot(user.id, RATE_LIMIT_BUCKET_INTERVIEW_SIMULATOR))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: InterviewBody;
  try {
    body = (await request.json()) as InterviewBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = body.action === "evaluate" ? "evaluate" : body.action === "start" ? "start" : "";
  if (!action) {
    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  }

  const positionId = typeof body.positionId === "string" ? body.positionId.trim() : "";
  if (!positionId) {
    return NextResponse.json({ ok: false, error: "position_id_required" }, { status: 400 });
  }

  const locale: InterviewSimulatorLocale = body.locale === "ar" ? "ar" : "en";

  const contextResult = await loadInterviewContext(supabase, user.id, positionId);
  if ("error" in contextResult) {
    const status =
      contextResult.error === "application_required"
        ? 403
        : contextResult.error === "position_not_found" || contextResult.error === "student_not_found"
          ? 404
          : 500;
    return NextResponse.json({ ok: false, error: contextResult.error }, { status });
  }

  const { student, internship } = contextResult;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (action === "start") {
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INTERVIEW_SIMULATOR_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildInterviewStartPrompt({ student, internship, locale }),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      const parsed = parseInterviewStartResponse(raw);
      if (!parsed) {
        return NextResponse.json({ ok: false, error: "invalid_ai_response" }, { status: 502 });
      }

      return NextResponse.json({ ok: true, data: parsed });
    } catch (error) {
      console.error("[api/ai/interview-simulator] OpenAI start error:", error);
      return NextResponse.json({ ok: false, error: "openai_failed" }, { status: 502 });
    }
  }

  const question = trimInterviewText(body.question, INTERVIEW_QUESTION_MAX_LEN);
  const answer = trimInterviewText(body.answer, INTERVIEW_ANSWER_MAX_LEN);
  const questionNumber =
    typeof body.questionNumber === "number" && Number.isFinite(body.questionNumber)
      ? Math.max(1, Math.min(5, Math.round(body.questionNumber)))
      : 0;

  if (!question || !answer || questionNumber < 1) {
    return NextResponse.json({ ok: false, error: "question_answer_required" }, { status: 400 });
  }

  if (answer.length < 10) {
    return NextResponse.json({ ok: false, error: "answer_too_short" }, { status: 400 });
  }

  const priorQa = parsePriorQa(body.priorQa);

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INTERVIEW_SIMULATOR_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildInterviewEvaluatePrompt({
            student,
            internship,
            locale,
            question,
            answer,
            questionNumber,
            priorQa,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseInterviewEvaluateResponse(raw, questionNumber);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "invalid_ai_response" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, data: parsed });
  } catch (error) {
    console.error("[api/ai/interview-simulator] OpenAI evaluate error:", error);
    return NextResponse.json({ ok: false, error: "openai_failed" }, { status: 502 });
  }
}
