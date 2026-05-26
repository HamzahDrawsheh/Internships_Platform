import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  consumeUserRateLimitSlot,
  RATE_LIMIT_BUCKET_FEEDBACK_ANALYZE,
} from "@/lib/server/in-memory-user-rate-limit";
import { createClient } from "@/lib/supabase/server";

const OPENAI_MODEL = process.env.OPENAI_FEEDBACK_MODEL ?? "gpt-4o-mini";

const SCORE_KEYS = [
  "overall_score",
  "learning_value",
  "mentorship_guidance",
  "work_environment",
  "task_relevance",
  "professionalism",
  "workload_fairness",
  "technical_exposure",
  "safety_respect",
] as const;

type ScoreKey = (typeof SCORE_KEYS)[number];

type ParsedAnalysis = {
  sentiment: "positive" | "neutral" | "negative";
  overall_score: number;
  learning_value: number;
  mentorship_guidance: number;
  work_environment: number;
  task_relevance: number;
  professionalism: number;
  workload_fairness: number;
  technical_exposure: number;
  safety_respect: number;
  keywords: string[] | null;
  summary: string | null;
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function normalizeSentiment(value: unknown): "positive" | "neutral" | "negative" {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v === "positive" || v === "neutral" || v === "negative") return v;
  return "neutral";
}

function normalizeKeywords(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const strings = value
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  return strings.length > 0 ? strings : null;
}

function normalizeSummary(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = typeof value === "string" ? value.trim() : String(value).trim();
  return s.length > 0 ? s : null;
}

function extractJsonFromContent(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const inner = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(inner) as unknown;
}

function parseAnalysisPayload(raw: unknown): ParsedAnalysis {
  if (!raw || typeof raw !== "object") {
    throw new Error("AI response was not a JSON object");
  }
  const o = raw as Record<string, unknown>;

  const scores = {} as Record<ScoreKey, number>;
  for (const key of SCORE_KEYS) {
    scores[key] = clampScore(o[key]);
  }

  return {
    sentiment: normalizeSentiment(o.sentiment),
    ...scores,
    keywords: normalizeKeywords(o.keywords),
    summary: normalizeSummary(o.summary),
  };
}

function buildPrompt(input: {
  feedback: string;
  overall_rating: number;
  mentorship_rating: number;
  environment_rating: number;
  skills_rating: number;
  would_recommend: boolean;
}): string {
  const wr =
    typeof input.would_recommend === "boolean"
      ? input.would_recommend
        ? "yes"
        : "no"
      : String(input.would_recommend);

  return `Analyze this internship feedback and return JSON only.

Return:
- sentiment (positive, neutral, negative)
- overall_score (0 to 1)
- learning_value (0 to 1)
- mentorship_guidance (0 to 1)
- work_environment (0 to 1)
- task_relevance (0 to 1)
- professionalism (0 to 1)
- workload_fairness (0 to 1)
- technical_exposure (0 to 1)
- safety_respect (0 to 1)
- keywords (array of strings)
- summary (short sentence)

Feedback:
"""
${input.feedback}
"""

Ratings:
- overall: ${input.overall_rating}
- mentorship: ${input.mentorship_rating}
- environment: ${input.environment_rating}
- skills: ${input.skills_rating}
- would_recommend: ${wr}`;
}

export async function POST(request: Request) {
  try {
    let supabaseAuth;
    try {
      supabaseAuth = await createClient();
    } catch {
      return NextResponse.json({ ok: false, error: "Server configuration error" }, { status: 500 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ ok: false, error: "Unable to verify permissions" }, { status: 500 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const feedbackId =
      typeof body === "object" &&
      body !== null &&
      "feedback_id" in body &&
      typeof (body as { feedback_id: unknown }).feedback_id === "string"
        ? (body as { feedback_id: string }).feedback_id.trim()
        : null;

    if (!feedbackId) {
      return NextResponse.json({ ok: false, error: "feedback_id is required" }, { status: 400 });
    }

    const isAdmin = profile?.role === "admin";

    // -------------------------------------------------------------------------
    // Authorization (non-admin): require ownership of this evaluation row.
    // Do NOT treat "row visible under loose RLS" or "id exists" as sufficient proof.
    // Required path: student_training_evaluations.student_id -> students.id
    //                  where students.user_id = auth.uid()
    // Implemented as two scoped queries (same logical join); service role runs only after this passes.
    // -------------------------------------------------------------------------
    if (!isAdmin) {
      const { data: callerStudent, error: callerStudentError } = await supabaseAuth
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (callerStudentError) {
        return NextResponse.json({ ok: false, error: "Unable to verify access" }, { status: 500 });
      }

      if (!callerStudent?.id) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }

      const { data: ownedEvaluation, error: ownedEvaluationError } = await supabaseAuth
        .from("student_training_evaluations")
        .select("id")
        .eq("id", feedbackId)
        .eq("student_id", callerStudent.id)
        .maybeSingle();

      if (ownedEvaluationError) {
        return NextResponse.json({ ok: false, error: "Unable to verify access" }, { status: 500 });
      }

      if (!ownedEvaluation) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    }

    // Limit OpenAI-bound analyze calls per user after authorization (admins share same bucket).
    if (!consumeUserRateLimitSlot(user.id, RATE_LIMIT_BUCKET_FEEDBACK_ANALYZE)) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    const supabase = createAdminClient();

    const { data: evaluation, error: fetchError } = await supabase
      .from("student_training_evaluations")
      .select(
        "id, other_notes, overall_rating, mentorship_rating, environment_rating, skills_rating, would_recommend"
      )
      .eq("id", feedbackId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
    }
    if (!evaluation) {
      return NextResponse.json({ ok: false, error: "Feedback not found" }, { status: 400 });
    }

    const feedbackText =
      evaluation.other_notes != null && String(evaluation.other_notes).trim().length > 0
        ? String(evaluation.other_notes)
        : "";

    const prompt = buildPrompt({
      feedback: feedbackText,
      overall_rating: evaluation.overall_rating as number,
      mentorship_rating: evaluation.mentorship_rating as number,
      environment_rating: evaluation.environment_rating as number,
      skills_rating: evaluation.skills_rating as number,
      would_recommend: evaluation.would_recommend as boolean,
    });

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You analyze internship training feedback. Reply with a single JSON object whose keys match exactly those requested in the user message. Scores must be numbers between 0 and 1.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ ok: false, error: "OpenAI returned empty content" }, { status: 500 });
    }

    let parsed: ParsedAnalysis;
    try {
      const rawJson = extractJsonFromContent(content);
      parsed = parseAnalysisPayload(rawJson);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to parse AI JSON";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }

    const analyzedAt = new Date().toISOString();

    const analysisRow = {
      feedback_id: feedbackId,
      sentiment: parsed.sentiment,
      overall_score: parsed.overall_score,
      learning_value: parsed.learning_value,
      mentorship_guidance: parsed.mentorship_guidance,
      work_environment: parsed.work_environment,
      task_relevance: parsed.task_relevance,
      professionalism: parsed.professionalism,
      workload_fairness: parsed.workload_fairness,
      technical_exposure: parsed.technical_exposure,
      safety_respect: parsed.safety_respect,
      keywords: parsed.keywords,
      summary: parsed.summary,
      analyzed_at: analyzedAt,
      updated_at: analyzedAt,
    };

    const { data: existing } = await supabase
      .from("feedback_analysis")
      .select("id")
      .eq("feedback_id", feedbackId)
      .maybeSingle();

    let saved;
    let persistError;

    if (existing) {
      const result = await supabase
        .from("feedback_analysis")
        .update(analysisRow)
        .eq("feedback_id", feedbackId)
        .select()
        .single();
      saved = result.data;
      persistError = result.error;
    } else {
      const result = await supabase.from("feedback_analysis").insert(analysisRow).select().single();
      saved = result.data;
      persistError = result.error;
    }

    if (persistError) {
      return NextResponse.json({ ok: false, error: persistError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, analysis: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback analysis failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
