export type ReportSkillCategory = "technical" | "soft" | "tool" | "domain";

export type TaskToSkillLocale = "en" | "ar";

export type ExtractedReportSkill = {
  skill_name: string;
  skill_category: ReportSkillCategory;
  evidence_text: string;
  confidence_score: number;
};

export type TaskToSkillAiResponse = {
  skills: ExtractedReportSkill[];
  summary: string;
};

export type StudentReportSkillRow = {
  id: string;
  student_id: string;
  report_id: string;
  skill_name: string;
  skill_category: ReportSkillCategory;
  evidence_text: string | null;
  confidence_score: number | null;
  source: string;
  approved_by_student: boolean;
  added_to_cv: boolean;
  approved_by_supervisor: boolean;
  created_at: string;
};

export const TASK_TO_SKILL_SYSTEM_PROMPT =
  "You extract employability skills from internship training reports. " +
  "Return strict JSON only. Do not include markdown, explanations, or code fences. " +
  "Extract only skills clearly supported by the report text. Do not invent skills or exaggerate level. " +
  "When the report describes technical work, return at least 4 skills (up to 12). " +
  "Each skill needs evidence_text quoted or paraphrased from the report and confidence_score between 0.55 and 1. " +
  'JSON shape: {"skills":[{"skill_name":"...","skill_category":"technical|soft|tool|domain","evidence_text":"...","confidence_score":0.85}],"summary":"..."}';

/** Real table: public.internship_monthly_reports */
export const MONTHLY_REPORT_TABLE = "internship_monthly_reports";

/** Real table: public.internship_weekly_reports (column: description, FK: monthly_report_id) */
export const WEEKLY_REPORT_TABLE = "internship_weekly_reports";

export type MonthlyReportTextRow = {
  assignments: string | null;
  work_summary: string | null;
};

export type WeeklyReportTextRow = {
  week_number: number;
  description: string | null;
};

const SKILL_CATEGORIES: ReportSkillCategory[] = ["technical", "soft", "tool", "domain"];

const MIN_CONFIDENCE = 0.55;

const BLOCKED_SKILL_PATTERNS: RegExp[] = [
  /\bsenior\b/i,
  /\blead\b/i,
  /\bprincipal\b/i,
  /\barchitect\b/i,
  /\bexpert\b/i,
  /\bcyber\s*security\s*expert\b/i,
  /\bdevops\s*engineer/i,
  /\bfull\s*stack\s*architect\b/i,
  /\b10\+\s*years\b/i,
];

export type ReportContentForExtraction = {
  reportTitle: string;
  assignments: string;
  workSummary: string;
  weeklyActivities: string;
  companyName: string;
  internshipLabel: string;
  existingSkills: string[];
  locale: TaskToSkillLocale;
};

function trimText(value: unknown, maxLen = 6000): string {
  if (value == null) return "";
  const s = String(value).replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

export function buildReportExtractionPrompt(content: ReportContentForExtraction): string {
  const languageNote =
    content.locale === "ar"
      ? "Write skill_name and evidence_text in Modern Standard Arabic where natural; keep skill_category in English as one of: technical, soft, tool, domain."
      : "Write skill_name and evidence_text in English.";

  const sections = [
    languageNote,
    "Return JSON only with this shape:",
    '{"skills":[{"skill_name":"...","skill_category":"technical|soft|tool|domain","evidence_text":"...","confidence_score":0.0}],"summary":"..."}',
    "Extract 3–12 skills maximum. confidence_score must be between 0 and 1.",
    "Do not assign senior/expert/architect level skills unless clearly demonstrated at that level.",
    "",
    `Report title: ${content.reportTitle}`,
    `Company: ${content.companyName}`,
    `Internship context: ${content.internshipLabel}`,
    "",
    "=== Completed tasks / assignments ===",
    content.assignments || "(not provided)",
    "",
    "=== Work summary / reflection ===",
    content.workSummary || "(not provided)",
    "",
    "=== Weekly activities ===",
    content.weeklyActivities || "(not provided)",
  ];

  if (content.existingSkills.length) {
    sections.push("", "=== Student profile skills (do not duplicate without evidence) ===", content.existingSkills.join(", "));
  }

  return sections.join("\n");
}

export function extractJsonFromContent(raw: string): unknown {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    text = fenced[1].trim();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as unknown;
    }
    throw new Error("AI response was not valid JSON");
  }
}

function normalizeCategory(value: unknown): ReportSkillCategory | null {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  const aliases: Record<string, ReportSkillCategory> = {
    technical: "technical",
    soft: "soft",
    tool: "tool",
    tools: "tool",
    technology: "tool",
    technologies: "tool",
    domain: "domain",
    "domain knowledge": "domain",
  };
  if (aliases[v]) return aliases[v];
  return SKILL_CATEGORIES.includes(v as ReportSkillCategory) ? (v as ReportSkillCategory) : null;
}

function normalizeConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const scaled = n > 1 && n <= 100 ? n / 100 : n;
  return Math.min(1, Math.max(0, scaled));
}

function pickStringField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function isBlockedSkillName(name: string): boolean {
  return BLOCKED_SKILL_PATTERNS.some((p) => p.test(name));
}

export type SkillFilterRejection = {
  raw: unknown;
  reason: string;
};

function trimReportField(value: unknown, maxLen = 8000): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

export function validateAndFilterExtractedSkills(
  raw: unknown,
  options?: { logRejections?: boolean }
): TaskToSkillAiResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("AI response was not a JSON object");
  }
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.skills)) {
    throw new Error("AI response missing skills array");
  }

  const seen = new Set<string>();
  const skills: ExtractedReportSkill[] = [];
  const rejected: SkillFilterRejection[] = [];

  for (const item of o.skills) {
    if (!item || typeof item !== "object") {
      rejected.push({ raw: item, reason: "not an object" });
      continue;
    }
    const row = item as Record<string, unknown>;
    const skill_name = trimText(
      pickStringField(row, ["skill_name", "skillName", "name", "skill"]),
      120
    );
    const evidence_text = trimReportField(
      pickStringField(row, ["evidence_text", "evidenceText", "evidence"]),
      500
    );
    const skill_category = normalizeCategory(
      row.skill_category ?? row.skillCategory ?? row.category
    );
    const confidence_score = normalizeConfidence(
      row.confidence_score ?? row.confidenceScore ?? row.confidence
    );

    if (!skill_name) {
      rejected.push({ raw: item, reason: "missing skill_name" });
      continue;
    }
    if (!skill_category) {
      rejected.push({ raw: item, reason: `invalid category for "${skill_name}"` });
      continue;
    }
    if (!evidence_text) {
      rejected.push({ raw: item, reason: `missing evidence for "${skill_name}"` });
      continue;
    }
    if (confidence_score < MIN_CONFIDENCE) {
      rejected.push({
        raw: item,
        reason: `low confidence ${confidence_score} for "${skill_name}"`,
      });
      continue;
    }
    if (isBlockedSkillName(skill_name)) {
      rejected.push({ raw: item, reason: `blocked senior-level name "${skill_name}"` });
      continue;
    }

    const key = skill_name.toLowerCase();
    if (seen.has(key)) {
      rejected.push({ raw: item, reason: `duplicate "${skill_name}"` });
      continue;
    }
    seen.add(key);

    skills.push({ skill_name, skill_category, evidence_text, confidence_score });
  }

  if (options?.logRejections && rejected.length > 0) {
    console.log("[task-to-skill] Filtered out skills:", rejected);
  }

  const summary =
    typeof o.summary === "string" && o.summary.trim()
      ? o.summary.trim().slice(0, 500)
      : "";

  return { skills, summary };
}

export function parseTaskToSkillAiResponse(
  content: string,
  options?: { logRejections?: boolean }
): TaskToSkillAiResponse {
  const parsed = extractJsonFromContent(content);
  return validateAndFilterExtractedSkills(parsed, options);
}

/**
 * Build combined report body from internship_monthly_reports + internship_weekly_reports.
 * Columns used (from StudentMonthlyWizard submit flow):
 * - internship_monthly_reports.assignments
 * - internship_monthly_reports.work_summary
 * - internship_weekly_reports.description (per week_number)
 */
export function buildCombinedReportText(
  monthly: MonthlyReportTextRow,
  weeks: WeeklyReportTextRow[]
): string {
  const parts: string[] = [];

  const assignments = trimReportField(monthly.assignments, 8000);
  if (assignments) {
    parts.push("=== Assignments / completed tasks ===", assignments);
  }

  const workSummary = trimReportField(monthly.work_summary, 8000);
  if (workSummary) {
    parts.push("=== Work summary / reflection / challenges / solutions ===", workSummary);
  }

  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);
  for (const week of sortedWeeks) {
    const desc = trimReportField(week.description, 4000);
    if (desc) {
      parts.push(`=== Week ${week.week_number} activities ===`, desc);
    }
  }

  return parts.join("\n\n");
}

export function groupSkillsByCategory(
  skills: StudentReportSkillRow[]
): Record<ReportSkillCategory, StudentReportSkillRow[]> {
  return {
    technical: skills.filter((s) => s.skill_category === "technical"),
    soft: skills.filter((s) => s.skill_category === "soft"),
    tool: skills.filter((s) => s.skill_category === "tool"),
    domain: skills.filter((s) => s.skill_category === "domain"),
  };
}
