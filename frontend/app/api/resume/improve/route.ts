import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  consumeUserRateLimitSlot,
  RATE_LIMIT_BUCKET_RESUME_IMPROVE,
} from "@/lib/server/in-memory-user-rate-limit";
import { createClient } from "@/lib/supabase/server";

const MODEL = process.env.OPENAI_RESUME_MODEL ?? "gpt-4o-mini";

type ImproveBody = {
  fullName?: string;
  university?: string;
  major?: string;
  skills?: string;
  education?: string;
  experience?: string;
  projects?: string;
  linkedin?: string;
  github?: string;
};

function extractJsonFromAssistantContent(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const inner = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(inner) as unknown;
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

  // Cap LLM-bound abuse per authenticated student before reading body / calling OpenAI.
  if (!consumeUserRateLimitSlot(user.id, RATE_LIMIT_BUCKET_RESUME_IMPROVE)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: ImproveBody;
  try {
    body = (await request.json()) as ImproveBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You improve CV content for Applicant Tracking Systems (ATS) using ONLY information the student provides.
Rules:
- Stay truthful. Do NOT invent employers, job titles, degrees, certifications, dates, projects, or skills not supported by the input.
- Rephrase for clarity, impact, and ATS keywords using only facts implied by the user's text.
- Use concise professional English.
- For experience and projects, prefer bullet lines starting with "- " (one bullet per line).
- Skills: deduplicate case-insensitively; output one comma-separated line unless empty.
- Summary: 2–4 short sentences professional profile; only if you can derive it from the provided facts; otherwise return an empty string for summary.

Respond with JSON ONLY and exactly these keys: "summary", "skills", "experience", "projects" (all strings).`;

  const userPrompt = [
    `fullName: ${body.fullName ?? ""}`,
    `university: ${body.university ?? ""}`,
    `major: ${body.major ?? ""}`,
    `education: ${body.education ?? ""}`,
    `skills: ${body.skills ?? ""}`,
    `experience: ${body.experience ?? ""}`,
    `projects: ${body.projects ?? ""}`,
    `linkedin: ${body.linkedin ?? ""}`,
    `github: ${body.github ?? ""}`,
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) {
      return NextResponse.json({ ok: false, error: "empty_response" }, { status: 502 });
    }

    const parsed = extractJsonFromAssistantContent(raw) as Record<string, unknown>;
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
    const skills = typeof parsed.skills === "string" ? parsed.skills : "";
    const experience = typeof parsed.experience === "string" ? parsed.experience : "";
    const projects = typeof parsed.projects === "string" ? parsed.projects : "";

    return NextResponse.json({
      ok: true,
      summary,
      skills,
      experience,
      projects,
    });
  } catch (e) {
    console.error("[resume/improve] OpenAI error:", e);
    return NextResponse.json({ ok: false, error: "openai_failed" }, { status: 502 });
  }
}
