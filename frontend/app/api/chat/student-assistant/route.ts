import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  consumeUserRateLimitSlot,
  RATE_LIMIT_BUCKET_STUDENT_ASSISTANT_CHAT,
} from "@/lib/server/in-memory-user-rate-limit";
import { cosineSimilarity, parsePgVector } from "@/lib/ai/vector-utils";
import { buildMatchInsights } from "@/lib/ai/match-insights";
import {
  buildStudentInternshipReportsContext,
  isReportRelatedQuestion,
  rankReportLinesForQuestion,
} from "@/lib/ai/student-assistant-internship-context";
import { parseCompanyEvaluationRpc, type CompanyEvaluationSummary } from "@/lib/companies/evaluation";

type ChatBody = {
  message?: string;
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

/** Max chars sent to the model (embedding-heavy catalogs are compact; details are capped). */
const MAX_CONTEXT_CHARS = 95_000;
const MAX_COMPANIES_LOADED = 500;
const MAX_ACTIVE_POSITIONS_LOADED = 800;
const MATCH_INDEX_MAX_LINES = 260;
const DETAIL_EXTRA_TOP_MATCHES = 18;
const APPLICATIONS_LIMIT = 100;

function normalizeText(input: unknown, maxLen = 1500): string {
  if (input === null || input === undefined) return "";
  const s = String(input).replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

type CompanyEvalAgg = Pick<
  CompanyEvaluationSummary,
  | "company_level"
  | "avg_score"
  | "total_feedbacks"
  | "avg_rating"
  | "is_new_company"
  | "evaluation_enabled"
  | "acceptance_ratio_pct"
  | "completion_rate_pct"
  | "company_score"
>;

function parseCompanyEvalPayload(data: unknown): CompanyEvalAgg | null {
  const parsed = parseCompanyEvaluationRpc(data);
  if (!parsed) return null;
  return {
    company_level: parsed.company_level,
    avg_score: parsed.avg_score,
    total_feedbacks: parsed.total_feedbacks,
    avg_rating: parsed.avg_rating,
    is_new_company: parsed.is_new_company,
    evaluation_enabled: parsed.evaluation_enabled,
    acceptance_ratio_pct: parsed.acceptance_ratio_pct,
    completion_rate_pct: parsed.completion_rate_pct,
    company_score: parsed.company_score,
  };
}

async function loadCompanyEvaluations(
  admin: ReturnType<typeof createAdminClient>,
  companyIds: string[]
): Promise<Map<string, CompanyEvalAgg>> {
  const out = new Map<string, CompanyEvalAgg>();
  const unique = [...new Set(companyIds)].filter(Boolean);
  const batchSize = 24;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (cid) => {
        const { data, error } = await admin.rpc("get_company_evaluation", { p_company_id: cid });
        if (error) return null;
        const parsed = parseCompanyEvalPayload(data);
        if (!parsed) return null;
        return [cid, parsed] as const;
      })
    );
    for (const row of results) {
      if (row) out.set(row[0], row[1]);
    }
  }
  return out;
}

async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    const embedding = response.data[0]?.embedding;
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) return null;
    return embedding;
  } catch {
    return null;
  }
}

function truncateContext(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[… context truncated for model length …]`;
}

type PositionRow = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  duration: string | null;
  location: string | null;
  type: string | null;
  is_active: boolean;
  embedding?: unknown;
  created_at?: string | null;
};

type ScoredPosition = {
  id: string;
  row: PositionRow;
  company_name: string;
  match_percentage: number | null;
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json({ ok: false, error: "ai_not_configured" }, { status: 503 });
    }

    let supabaseAuth;
    try {
      supabaseAuth = await createClient();
    } catch {
      return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAuth
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ ok: false, error: "profile_error" }, { status: 500 });
    }

    if (profile?.role !== "student") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!(await consumeUserRateLimitSlot(user.id, RATE_LIMIT_BUCKET_STUDENT_ASSISTANT_CHAT))) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    let body: ChatBody;
    try {
      body = (await request.json()) as ChatBody;
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ ok: false, error: "message_required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const [{ data: student }, { data: additional }] = await Promise.all([
      admin
        .from("students")
        .select(
          "id, user_id, university, major, department, skills, preferences, cv_url, cv_path, supervisor_id, created_at, embedding_updated_at, embedding"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("student_additional_info")
        .select(
          "gpa, technical_skills, soft_skills, taken_courses, custom_courses, preferred_field, preferred_location, preferred_work_type, availability, updated_at"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (!student?.id) {
      return NextResponse.json(
        {
          ok: true,
          answer:
            "I can help once your student profile is created. Please complete onboarding / student profile first.",
          out_of_context: true,
          sources: [] as { id: string; type: string; title: string }[],
        },
        { status: 200 }
      );
    }

    const studentId = String(student.id);
    const studentVec = parsePgVector(
      (student as { embedding?: unknown }).embedding ?? null
    );

    const internshipReportsCtx = await buildStudentInternshipReportsContext(admin, studentId);

    const [{ data: applications }, { data: allCompanies }, { data: allActivePositions }] =
      await Promise.all([
        admin
          .from("applications")
          .select("id, position_id, status, message, applied_at")
          .eq("student_id", studentId)
          .order("applied_at", { ascending: false })
          .limit(APPLICATIONS_LIMIT),
        admin
          .from("companies")
          .select("*")
          .order("company_name", { ascending: true })
          .limit(MAX_COMPANIES_LOADED),
        admin
          .from("internship_positions")
          .select(
            "id, company_id, title, description, requirements, duration, location, type, is_active, embedding, created_at"
          )
          .eq("is_active", true)
          .limit(MAX_ACTIVE_POSITIONS_LOADED),
      ]);

    const applicationIds = (applications ?? []).map((a) => String(a.id));

    const [{ data: evaluations }, { data: ratings }] = await Promise.all([
      applicationIds.length > 0
        ? admin
            .from("student_training_evaluations")
            .select(
              "id, application_id, overall_rating, mentorship_rating, environment_rating, skills_rating, would_recommend, other_notes, created_at"
            )
            .eq("student_id", studentId)
            .in("application_id", applicationIds)
        : Promise.resolve({ data: [] as unknown[] }),
      admin
        .from("ratings")
        .select("id, company_id, position_id, rating, feedback, created_at")
        .eq("student_id", studentId),
    ]);

    const companyById = new Map(
      (allCompanies ?? []).map((c) => [String((c as { id: unknown }).id), c as Record<string, unknown>])
    );

    const companyIdsLoaded = [...companyById.keys()];
    const companyEvalById = await loadCompanyEvaluations(admin, companyIdsLoaded);

    const positionsList: PositionRow[] = (rawActivePositions(allActivePositions));

    const studentSources = {
      skills: (student as { skills?: string | null }).skills ?? null,
      technical_skills: additional?.technical_skills ?? undefined,
      soft_skills: additional?.soft_skills ?? undefined,
      taken_courses: additional?.taken_courses ?? undefined,
      custom_courses: additional?.custom_courses ?? undefined,
      preferred_field: additional?.preferred_field ?? undefined,
    };

    const scoredPositions: ScoredPosition[] = positionsList.map((p) => {
      const pid = String(p.id);
      const cid = String(p.company_id);
      const c = companyById.get(cid);
      const companyName = normalizeText(c?.company_name ?? "", 200);
      const emb = parsePgVector(p.embedding ?? null);
      let match_percentage: number | null = null;
      if (studentVec && emb) {
        const sim = cosineSimilarity(studentVec, emb);
        match_percentage = Math.round(Math.max(0, Math.min(1, sim)) * 10000) / 100;
      }
      return { id: pid, row: p, company_name: companyName, match_percentage };
    });

    scoredPositions.sort((a, b) => {
      const ax = a.match_percentage ?? -1;
      const bx = b.match_percentage ?? -1;
      return bx - ax;
    });

    const appliedPositionIds = new Set(
      (applications ?? []).map((a) => String(a.position_id)).filter(Boolean)
    );

    const matchIndexLines = scoredPositions.slice(0, MATCH_INDEX_MAX_LINES).map((sp) => {
      const m =
        sp.match_percentage != null ? `${sp.match_percentage}%` : "no_embedding_or_student_vector";
      return `${m} | ${normalizeText(sp.row.title, 120)} | ${sp.company_name} | position_id=${sp.id}`;
    });

    const detailPositionIds = new Set<string>(appliedPositionIds);
    for (const sp of scoredPositions) {
      if (detailPositionIds.size >= appliedPositionIds.size + DETAIL_EXTRA_TOP_MATCHES) break;
      if (!detailPositionIds.has(sp.id)) detailPositionIds.add(sp.id);
    }

    const detailBlocks: string[] = [];
    const scoredById = new Map(scoredPositions.map((s) => [s.id, s]));
    for (const pid of detailPositionIds) {
      const sp = scoredById.get(pid);
      if (!sp) continue;
      const p = sp.row;
      const cid = String(p.company_id);
      const evalAgg = companyEvalById.get(cid);
      const mi = buildMatchInsights({
        studentSources,
        internshipTitle: p.title,
        internshipRequirements: p.requirements ?? null,
        internshipDescription: p.description ?? null,
        matchPercentage: sp.match_percentage ?? 0,
      });
      const insightsOneLine = [
        ...mi.summary_lines.slice(0, 3),
        mi.matched_skills.length ? `Matched skills: ${mi.matched_skills.slice(0, 8).join(", ")}` : "",
        mi.gaps.length ? `Gaps: ${mi.gaps.slice(0, 5).join("; ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      detailBlocks.push(
        [
          `POSITION_ID: ${p.id}`,
          `TITLE: ${normalizeText(p.title, 300)}`,
          `COMPANY_ID: ${cid}`,
          `COMPANY_NAME: ${sp.company_name}`,
          `COMPANY_LEVEL (W/G/B): ${evalAgg?.company_level ?? "unknown"} (white=stronger weighted score, gray=mid, black=lower; null=new or insufficient data)`,
          `COMPANY_NEW: ${evalAgg?.is_new_company ? "yes" : "no"}`,
          `COMPANY_EVAL_PUBLIC: ${evalAgg?.evaluation_enabled ? "yes" : "no"}`,
          `COMPANY_WEIGHTED_SCORE_0_TO_1: ${evalAgg?.company_score ?? "null"}`,
          `COMPANY_ACCEPTANCE_RATE_PCT: ${evalAgg?.acceptance_ratio_pct ?? "null"}`,
          `COMPANY_COMPLETION_RATE_PCT: ${evalAgg?.completion_rate_pct ?? "null"}`,
          `COMPANY_TRAINING_AVG_SCORE_0_TO_1: ${evalAgg?.avg_score ?? "null"}`,
          `N_TRAINING_EVALUATIONS: ${evalAgg?.total_feedbacks ?? 0}`,
          `MATCH_PERCENT_SEMANTIC: ${sp.match_percentage != null ? `${sp.match_percentage}% (cosine similarity of profile vs listing embeddings when both exist)` : "not_computed"}`,
          `LOCATION: ${normalizeText(p.location, 200)}`,
          `TYPE: ${normalizeText(p.type, 120)}`,
          `DURATION: ${normalizeText(p.duration, 120)}`,
          `REQUIREMENTS: ${normalizeText(p.requirements, 1200)}`,
          `DESCRIPTION: ${normalizeText(p.description, 1200)}`,
          `MATCH_INSIGHTS: ${normalizeText(insightsOneLine, 1500)}`,
        ].join("\n")
      );
    }

    const companyDirectoryLines = (allCompanies ?? []).map((c) => {
      const cid = String((c as { id: unknown }).id);
      const ev = companyEvalById.get(cid);
      const name = normalizeText((c as { company_name: unknown }).company_name, 200);
      const loc = normalizeText((c as { location: unknown }).location, 120);
      const site = normalizeText((c as { website: unknown }).website, 120);
      const desc = normalizeText((c as { description: unknown }).description, 400);
      return [
        cid,
        name,
        loc,
        site,
        `level=${ev?.company_level ?? "n/a"}`,
        `new=${ev?.is_new_company ? "yes" : "no"}`,
        `eval_public=${ev?.evaluation_enabled ? "yes" : "no"}`,
        `score=${ev?.company_score ?? "n/a"}`,
        `accept_pct=${ev?.acceptance_ratio_pct ?? "n/a"}`,
        `completion_pct=${ev?.completion_rate_pct ?? "n/a"}`,
        `avg=${ev?.avg_score ?? "n/a"}`,
        `n=${ev?.total_feedbacks ?? 0}`,
        desc ? `desc=${desc}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    });

    const applicationLines = (applications ?? []).map((a) => {
      const sp = scoredById.get(String(a.position_id));
      const title = sp ? normalizeText(sp.row.title, 160) : "";
      const mp = sp?.match_percentage != null ? `${sp.match_percentage}%` : "?";
      return [
        `application_id=${a.id}`,
        `position_id=${a.position_id}`,
        title ? `title=${title}` : "",
        `status=${normalizeText(a.status, 40)}`,
        `applied_at=${normalizeText(a.applied_at, 80)}`,
        `match_approx=${mp}`,
        a.message ? `message=${normalizeText(a.message, 400)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    });

    const evaluationLines = ((evaluations ?? []) as Array<Record<string, unknown>>).map((e) =>
      [
        `evaluation_id=${normalizeText(e.id, 80)}`,
        `application_id=${normalizeText(e.application_id, 80)}`,
        `overall=${normalizeText(e.overall_rating, 20)}`,
        `mentorship=${normalizeText(e.mentorship_rating, 20)}`,
        `environment=${normalizeText(e.environment_rating, 20)}`,
        `skills=${normalizeText(e.skills_rating, 20)}`,
        `would_recommend=${normalizeText(e.would_recommend, 20)}`,
        `notes=${normalizeText(e.other_notes, 600)}`,
        `created_at=${normalizeText(e.created_at, 80)}`,
      ].join(" | ")
    );

    const ratingLines = ((ratings ?? []) as Array<Record<string, unknown>>).map((r) => {
      const cid = normalizeText(r.company_id, 80);
      const cname = companyById.get(String(r.company_id));
      return [
        `rating_id=${normalizeText(r.id, 80)}`,
        `company_id=${cid}`,
        cname ? `company=${normalizeText(cname.company_name, 160)}` : "",
        `position_id=${normalizeText(r.position_id, 80)}`,
        `stars=${normalizeText(r.rating, 10)}`,
        `feedback=${normalizeText(r.feedback, 500)}`,
        `created_at=${normalizeText(r.created_at, 80)}`,
      ]
        .filter(Boolean)
        .join(" | ");
    });

    const stud = student as Record<string, unknown>;
    const studentProfileBlock = [
      "=== STUDENT_PROFILE (this user) ===",
      `profile_id=${String(stud.id)}`,
      `user_id=${String(stud.user_id ?? "")}`,
      `name=${normalizeText(profile?.full_name || "Student", 200)}`,
      `email=${normalizeText(profile?.email || "", 200)}`,
      `university=${normalizeText(stud.university, 200)}`,
      `major=${normalizeText(stud.major, 200)}`,
      `department=${normalizeText(stud.department, 200)}`,
      `supervisor_id=${normalizeText(stud.supervisor_id, 80)}`,
      `skills=${normalizeText(stud.skills, 800)}`,
      `preferences=${normalizeText(stud.preferences, 800)}`,
      `cv_url=${normalizeText(stud.cv_url, 300)}`,
      `cv_path=${normalizeText(stud.cv_path, 300)}`,
      `student_created_at=${normalizeText(stud.created_at, 80)}`,
      `embedding_updated_at=${normalizeText(stud.embedding_updated_at, 80)}`,
      `has_profile_embedding=${studentVec ? "yes" : "no"}`,
    ].join("\n");

    const additionalBlock =
      additional &&
      [
        "=== STUDENT_ADDITIONAL_INFO ===",
        `gpa=${normalizeText(additional.gpa, 40)}`,
        `technical_skills=${normalizeText(additional.technical_skills, 800)}`,
        `soft_skills=${normalizeText(additional.soft_skills, 800)}`,
        `taken_courses=${normalizeText(additional.taken_courses, 800)}`,
        `custom_courses=${normalizeText(additional.custom_courses, 800)}`,
        `preferred_field=${normalizeText(additional.preferred_field, 200)}`,
        `preferred_location=${normalizeText(additional.preferred_location, 200)}`,
        `preferred_work_type=${normalizeText(additional.preferred_work_type, 120)}`,
        `availability=${normalizeText(additional.availability, 400)}`,
        `updated_at=${normalizeText(additional.updated_at, 80)}`,
      ].join("\n");

    const platformSummary = [
      "=== PLATFORM_SNAPSHOT (scoped to loaded rows) ===",
      `companies_loaded=${(allCompanies ?? []).length} (max ${MAX_COMPANIES_LOADED})`,
      `active_internships_loaded=${positionsList.length} (max ${MAX_ACTIVE_POSITIONS_LOADED})`,
      `your_applications=${(applications ?? []).length}`,
      `your_training_evaluations=${(evaluations ?? []).length}`,
      `your_company_ratings=${(ratings ?? []).length}`,
      `has_internship_tracking=${internshipReportsCtx.hasInternshipTracking ? "yes" : "no"}`,
      "company_level: white/gray/black from weighted company_score (acceptance ratio, completion, student feedback); null = new company or not enough data for public evaluation.",
      "is_new_company: yes until the company has posted internships AND accepted at least one trainee.",
      "evaluation_enabled: public scores/rankings only when the company has enough track record (3+ completed internships or 5+ student evaluations).",
      "match_percentage: semantic similarity 0–100 from student vs internship embeddings (same idea as /api/recommendations/internships) when both embeddings exist.",
    ].join("\n");

    const contextParts = [
      platformSummary,
      studentProfileBlock,
      additionalBlock,
      internshipReportsCtx.contextBlock,
      "=== COMPANY_DIRECTORY (all loaded companies + aggregates) ===\n" + companyDirectoryLines.join("\n"),
      "=== INTERNSHIP_MATCH_INDEX (compact, best match first) ===\n" + matchIndexLines.join("\n"),
      "=== INTERNSHIP_DETAILS (applied + top semantic matches; includes match insights) ===\n" +
        detailBlocks.join("\n\n---\n\n"),
      "=== YOUR_APPLICATIONS ===\n" + applicationLines.join("\n"),
      "=== YOUR_TRAINING_EVALUATIONS ===\n" + evaluationLines.join("\n"),
      "=== YOUR_COMPANY_RATINGS ===\n" + ratingLines.join("\n"),
    ].filter(Boolean);

    let contextText = contextParts.join("\n\n");
    contextText = truncateContext(contextText, MAX_CONTEXT_CHARS);

    const reportRanked = rankReportLinesForQuestion(internshipReportsCtx.reportSummaryLines, message);
    if (reportRanked.length > 0 || isReportRelatedQuestion(message)) {
      const lines =
        reportRanked.length > 0
          ? reportRanked
          : internshipReportsCtx.reportSummaryLines.slice(0, 8);
      contextText = truncateContext(
        `${contextText}\n\n=== TOP_MONTHLY_REPORTS_FOR_THIS_QUESTION (retrieved from your data) ===\n${lines.join("\n")}`,
        MAX_CONTEXT_CHARS
      );
    }

    const queryEmbedding = await embedQuery(message);
    if (queryEmbedding && positionsList.length > 0) {
      const extraLines: string[] = [];
      let ranked = positionsList
        .map((p) => {
          const emb = parsePgVector(p.embedding ?? null);
          if (!emb) return null;
          const sim = cosineSimilarity(queryEmbedding, emb);
          return { p, sim };
        })
        .filter((x): x is { p: PositionRow; sim: number } => x != null);
      ranked.sort((a, b) => b.sim - a.sim);
      ranked = ranked.slice(0, 8);
      for (const { p, sim } of ranked) {
        const cid = String(p.company_id);
        const c = companyById.get(cid);
        const simPct = Math.round(Math.max(0, Math.min(1, sim)) * 10000) / 100;
        const coName =
          c && typeof c.company_name === "string" ? c.company_name : "";
        extraLines.push(
          `question_similar_position: score=${simPct}% | ${normalizeText(p.title, 100)} | ${normalizeText(coName, 100)} | id=${p.id}`
        );
      }
      if (extraLines.length) {
        contextText = truncateContext(
          `${contextText}\n\n=== TOP_POSITIONS_FOR_THIS_QUESTION (embedding vs user message) ===\n${extraLines.join("\n")}`,
          MAX_CONTEXT_CHARS
        );
      }
    }

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

    const systemPrompt = `You are "InternConnect Student Assistant": a warm, supportive helper for students using an internship / training platform.

DATA YOU HAVE:
- Full student profile & preferences for this user.
- Directory of companies on the platform (within the loaded cap) plus aggregated training-evaluation bands:
  - company_level "white" | "gray" | "black" = W / G / B style band from pooled student training evaluations (white = stronger average, black = lower); null / n/a = not enough data.
- Active internships (loaded cap), each with semantic match_percentage vs this student's profile when embeddings exist (same family as the recommendations API).
- This student's applications, training evaluations, and star ratings.
- **Monthly JUST internship reports**: live tracking per internship (status per month, due dates, what Part I sections are filled, attendance summary, next action, form URLs). Section MONTHLY_INTERNSHIP_REPORTS_GUIDE + YOUR_INTERNSHIP_TRACKING & MONTHLY REPORTS.
- Optional "TOP_POSITIONS_FOR_THIS_QUESTION" when the question is embedded against listings.
- Optional "TOP_MONTHLY_REPORTS_FOR_THIS_QUESTION" when the question matches report keywords or report lines.

TONE:
- Be kind, encouraging, and conversational.
- For greetings: reply briefly and warmly, then steer to internships / their data.
- For vague questions: acknowledge nicely, ground in their data, ask ONE clarifying question if needed.
- If the user asks "getting started", "what should I do next", or "steps", provide a clear step-by-step sequence that matches the product flow:
  1) Complete student profile (department + skills + preferences)
  2) Build CV with the CV builder (optional)
  3) Browse internships + apply
  4) Track applications
  5) After acceptance: complete **monthly JUST internship reports** each month (Student Part I → employer → university supervisor) via Monthly internship reports in the dashboard
  6) After all months approved + internship end date: upload **final report** PDF
  7) After completion: submit training evaluation + company rating
  Mention they can open the "Getting started" wizard on the Student Dashboard for application steps, and **Monthly internship reports** for the JUST workflow.

MONTHLY REPORT QUESTIONS:
- Use ONLY YOUR_INTERNSHIP_TRACKING & MONTHLY REPORTS data for statuses, due dates, and next actions.
- Give concrete steps: which month to open, which wizard step (Basic info / Assignments / Weekly / Review), and the exact path from NEXT_ACTION or open_form in context.
- If student_can_submit=no, explain who must act next (employer or supervisor) or why the month is locked.
- If revision_requested is set, tell them what to fix and that they can edit only when status allows (rejected / overdue / unlocked).
- Attendance is entered by the employer; student sees a read-only summary on the Review step.
- Never invent report statuses or due dates not in context.

CRITICAL RULES (anti-hallucination):
- For facts (names, levels, match %, statuses): use ONLY the CONTEXT below.
- Never invent company levels or match scores.
- If the user asks for something outside the data (e.g. all companies worldwide) or data is missing, explain kindly and clarify.
- If the user mentions "white/grey/gray/black companies", map that to company_level in the data (white/gray/black); do not interpret by race.

OUTPUT JSON ONLY:
- answer: string
- out_of_context: boolean (true only if clearly unrelated and not a greeting)
- sources: array of { id: string, type: string, title: string } — cite section keys you used (e.g. id "company_directory", type "catalog", title "Companies") when listing facts.`;

    const userPrompt = `USER_QUESTION:
${message}

CONTEXT:
${contextText}`;

    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content?.trim()) {
      return NextResponse.json({ ok: false, error: "empty_response" }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_ai_json" }, { status: 502 });
    }

    const o = parsed as Record<string, unknown>;
    const answer = typeof o.answer === "string" ? o.answer : "I couldn't generate an answer.";
    const out_of_context = typeof o.out_of_context === "boolean" ? o.out_of_context : false;
    const sourcesRaw = Array.isArray(o.sources) ? o.sources : [];
    const sources = sourcesRaw
      .map((s) => (s && typeof s === "object" ? (s as Record<string, unknown>) : null))
      .filter(Boolean)
      .slice(0, 5)
      .map((s) => ({
        id: typeof s!.id === "string" ? s!.id : "",
        type: typeof s!.type === "string" ? s!.type : "",
        title: typeof s!.title === "string" ? s!.title : "",
      }))
      .filter((s) => s.id && s.type && s.title);

    return NextResponse.json({ ok: true, answer, out_of_context, sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "student_assistant_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function rawActivePositions(data: unknown[] | null | undefined): PositionRow[] {
  const rows: PositionRow[] = [];
  for (const raw of data ?? []) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const id = p.id != null ? String(p.id) : "";
    const company_id = p.company_id != null ? String(p.company_id) : "";
    if (!id || !company_id) continue;
    rows.push({
      id,
      company_id,
      title: p.title != null ? String(p.title) : "",
      description: p.description != null ? String(p.description) : null,
      requirements: p.requirements != null ? String(p.requirements) : null,
      duration: p.duration != null ? String(p.duration) : null,
      location: p.location != null ? String(p.location) : null,
      type: p.type != null ? String(p.type) : null,
      is_active: Boolean(p.is_active),
      embedding: p.embedding,
      created_at: p.created_at != null ? String(p.created_at) : null,
    });
  }
  return rows;
}
