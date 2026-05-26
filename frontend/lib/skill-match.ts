import type { StudentSkillSources } from "@/lib/ai/match-insights";

const SKILL_DELIMITERS = /[,;\n|/]+/;

/** Canonical whitelist — only these may appear as internship/student skills. */
export const SKILL_WHITELIST: readonly { canonical: string; display: string }[] = [
  { canonical: "python", display: "Python" },
  { canonical: "java", display: "Java" },
  { canonical: "javascript", display: "JavaScript" },
  { canonical: "typescript", display: "TypeScript" },
  { canonical: "react", display: "React" },
  { canonical: "next.js", display: "Next.js" },
  { canonical: "node.js", display: "Node.js" },
  { canonical: "sql", display: "SQL" },
  { canonical: "postgresql", display: "PostgreSQL" },
  { canonical: "supabase", display: "Supabase" },
  { canonical: "excel", display: "Excel" },
  { canonical: "power bi", display: "Power BI" },
  { canonical: "tableau", display: "Tableau" },
  { canonical: "data analysis", display: "Data Analysis" },
  { canonical: "data visualization", display: "Data Visualization" },
  { canonical: "machine learning", display: "Machine Learning" },
  { canonical: "artificial intelligence", display: "Artificial Intelligence" },
  { canonical: "statistics", display: "Statistics" },
  { canonical: "html", display: "HTML" },
  { canonical: "css", display: "CSS" },
  { canonical: "git", display: "Git" },
  { canonical: "github", display: "GitHub" },
  { canonical: "ui/ux", display: "UI/UX" },
  { canonical: "figma", display: "Figma" },
  { canonical: "communication", display: "Communication" },
  { canonical: "problem solving", display: "Problem Solving" },
  { canonical: "teamwork", display: "Teamwork" },
  { canonical: "project management", display: "Project Management" },
  { canonical: "cybersecurity", display: "Cybersecurity" },
  { canonical: "networking", display: "Networking" },
  { canonical: "cloud computing", display: "Cloud Computing" },
  { canonical: "aws", display: "AWS" },
  { canonical: "azure", display: "Azure" },
  { canonical: "docker", display: "Docker" },
] as const;

const DISPLAY_BY_CANONICAL = new Map(SKILL_WHITELIST.map((s) => [s.canonical, s.display]));

/** Longest canonical keys first for text scanning. */
const WHITELIST_BY_LENGTH = [...SKILL_WHITELIST].sort(
  (a, b) => b.canonical.length - a.canonical.length
);

const SYNONYM_TO_CANONICAL: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  python: "python",
  py: "python",
  powerbi: "power bi",
  "power-bi": "power bi",
  "power bi": "power bi",
  postgres: "postgresql",
  postgresql: "postgresql",
  "data viz": "data visualization",
  "data visualization": "data visualization",
  "data visualisation": "data visualization",
  ml: "machine learning",
  "machine learning": "machine learning",
  "deep learning": "machine learning",
  ai: "artificial intelligence",
  "artificial intelligence": "artificial intelligence",
  reactjs: "react",
  react: "react",
  nextjs: "next.js",
  "next js": "next.js",
  "next.js": "next.js",
  nodejs: "node.js",
  "node js": "node.js",
  "node.js": "node.js",
  pg: "postgresql",
  supabase: "supabase",
  excel: "excel",
  tableau: "tableau",
  sql: "sql",
  java: "java",
  html: "html",
  css: "css",
  git: "git",
  github: "github",
  figma: "figma",
  "ui ux": "ui/ux",
  "ui/ux": "ui/ux",
  aws: "aws",
  azure: "azure",
  docker: "docker",
  statistics: "statistics",
  stats: "statistics",
  "data analysis": "data analysis",
  communication: "communication",
  "problem solving": "problem solving",
  teamwork: "teamwork",
  "project management": "project management",
  cybersecurity: "cybersecurity",
  networking: "networking",
  "cloud computing": "cloud computing",
};

const INVALID_SUBSTRINGS = [
  "through",
  "whether",
  "beginner",
  "professional",
  "looking",
  "sessions",
  "courses",
  "cover",
  "key tools",
  "hands-on",
  "real-world",
  "expert-led",
  "upskill",
  "projects",
  "we cover",
  "you are",
  "looking to",
  "efficiency",
  "platforms",
  "analytics platforms",
  "modern analytics",
];

const STANDALONE_STOP_WORDS = new Set(["and", "or", "we", "you", "a", "an", "the", "to", "for"]);

/** Junk tokens sometimes scraped from posting prose — never show as skills or improvement tips. */
const IMPROVEMENT_STOP_WORDS = new Set([
  ...STANDALONE_STOP_WORDS,
  "nothing",
  "something",
  "anything",
  "everything",
  "none",
  "n/a",
  "na",
  "tbd",
  "unknown",
  "other",
  "misc",
  "when",
  "where",
  "which",
  "what",
  "who",
  "how",
  "why",
  "this",
  "that",
  "these",
  "those",
  "here",
  "there",
  "with",
  "from",
  "into",
  "about",
  "after",
  "before",
  "returns",
  "splits",
  "caller",
  "drops",
  "blob",
  "may",
  "can",
  "will",
  "must",
  "should",
  "have",
  "has",
  "had",
  "been",
  "being",
  "are",
  "is",
  "was",
  "were",
]);

export type LearningPlanEntry = {
  skill: string;
  steps: string[];
};

export type SkillGapAnalysis = {
  matchedSkills: string[];
  missingSkills: string[];
  missingSkillsCount: number;
  learningPlan: LearningPlanEntry[];
  internshipSkillCount: number;
  studentSkillCount: number;
  hasDetectableInternshipSkills: boolean;
};

export type SkillGapStudentInput = StudentSkillSources & {
  major?: string | null;
  department?: string | null;
};

export type InternshipSkillSource = {
  requirements?: string | null;
  description?: string | null;
  required_skills?: string | string[] | null;
  skills?: string | string[] | null;
  technical_skills?: string | string[] | null;
  requirements_skills?: string | string[] | null;
  requiredSkills?: string | string[] | null;
  responsibilities?: string | null;
};

function normalizeRaw(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function isInvalidPhrase(text: string): boolean {
  const norm = normalizeRaw(text);
  if (!norm) return true;
  if (STANDALONE_STOP_WORDS.has(norm)) return true;
  if (norm === "and" || norm === "or") return true;
  const words = norm.split(/\s+/);
  if (words.length > 4) return true;
  if (/[.!?]$/.test(text.trim())) return true;
  if (/\b(and|or)\b/i.test(norm) && words.length <= 3) return true;
  for (const bad of INVALID_SUBSTRINGS) {
    if (norm.includes(bad)) return true;
  }
  return false;
}

/** Map any label to canonical whitelist key, or null if not a valid skill. */
export function toCanonicalSkill(raw: string): string | null {
  const norm = normalizeRaw(raw);
  if (!norm || isInvalidPhrase(raw)) return null;

  if (SYNONYM_TO_CANONICAL[norm]) {
    return SYNONYM_TO_CANONICAL[norm];
  }

  const compact = norm.replace(/\s/g, "");
  if (SYNONYM_TO_CANONICAL[compact]) {
    return SYNONYM_TO_CANONICAL[compact];
  }

  if (DISPLAY_BY_CANONICAL.has(norm)) {
    return norm;
  }

  for (const { canonical } of WHITELIST_BY_LENGTH) {
    if (norm === canonical) return canonical;
  }

  return null;
}

function collectStringList(value: string | string[] | null | undefined): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((v) => (typeof v === "string" ? collectStringList(v) : []));
  }
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (SKILL_DELIMITERS.test(trimmed)) {
    return trimmed.split(SKILL_DELIMITERS).map((s) => s.trim()).filter(Boolean);
  }
  return [trimmed];
}

function addCanonicalSkill(seen: Set<string>, out: string[], canonical: string): void {
  if (seen.has(canonical)) return;
  seen.add(canonical);
  out.push(DISPLAY_BY_CANONICAL.get(canonical) ?? canonical);
}

/** Scan free text for whitelist skills (longest match first). */
function scanTextForWhitelistSkills(text: string, seen: Set<string>, out: string[]): void {
  const lower = text.toLowerCase();
  for (const { canonical, display } of WHITELIST_BY_LENGTH) {
    if (seen.has(canonical)) continue;
    const pattern = canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[^a-z0-9])${pattern}(?:[^a-z0-9]|$)`, "i");
    if (re.test(lower)) {
      addCanonicalSkill(seen, out, canonical);
      void display;
    }
  }
}

/**
 * Extract valid internship skills: structured fields → validated requirements tokens → whitelist scan.
 */
export function extractInternshipSkills(source: InternshipSkillSource): {
  skills: string[];
  canonicalKeys: string[];
} {
  const seen = new Set<string>();
  const skills: string[] = [];

  const structuredParts: string[] = [
    ...collectStringList(source.required_skills),
    ...collectStringList(source.skills),
    ...collectStringList(source.technical_skills),
    ...collectStringList(source.requirements_skills),
    ...collectStringList(source.requiredSkills),
  ];

  for (const part of structuredParts) {
    const canonical = toCanonicalSkill(part);
    if (canonical) addCanonicalSkill(seen, skills, canonical);
  }

  if (source.requirements?.trim()) {
    for (const part of source.requirements.split(SKILL_DELIMITERS)) {
      const label = part.trim();
      if (!label || isInvalidPhrase(label)) continue;
      const canonical = toCanonicalSkill(label);
      if (canonical) addCanonicalSkill(seen, skills, canonical);
    }
  }

  const proseSources = [source.requirements, source.description, source.responsibilities].filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0
  );

  for (const prose of proseSources) {
    scanTextForWhitelistSkills(prose, seen, skills);
  }

  return {
    skills,
    canonicalKeys: [...seen],
  };
}

function splitStudentTokens(input: string): string[] {
  if (SKILL_DELIMITERS.test(input)) {
    return input.split(SKILL_DELIMITERS).map((s) => s.trim()).filter(Boolean);
  }
  return [input.trim()].filter(Boolean);
}

function mergeStudentCanonicalSkills(input: SkillGapStudentInput): string[] {
  const seen = new Set<string>();

  const rawParts: string[] = [
    ...collectStringList(input.technical_skills ?? undefined),
    ...collectStringList(input.skills ?? undefined),
    ...collectStringList(input.soft_skills ?? undefined),
    ...collectStringList(input.taken_courses ?? undefined),
    ...collectStringList(input.custom_courses ?? undefined),
    ...collectStringList(input.preferred_field ?? undefined),
    ...collectStringList(input.major ?? undefined),
    ...collectStringList(input.department ?? undefined),
  ];

  const scanBuffer: string[] = [];
  for (const part of rawParts) {
    for (const token of splitStudentTokens(part)) {
      const canonical = toCanonicalSkill(token);
      if (canonical) {
        seen.add(canonical);
      } else if (token.length > 1) {
        scanTextForWhitelistSkills(token, seen, scanBuffer);
      }
    }
  }

  return [...seen];
}

function studentHasCanonical(studentCanonical: Set<string>, requiredCanonical: string): boolean {
  if (studentCanonical.has(requiredCanonical)) return true;
  return false;
}

/**
 * Whitelist-only skill labels safe to show in “how to improve” lists.
 * Drops prose fragments (e.g. “nothing”) scraped from posting text.
 */
export function sanitizeImprovementSkills(...labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of labels) {
    if (typeof raw !== "string") continue;
    const norm = normalizeRaw(raw);
    if (!norm || IMPROVEMENT_STOP_WORDS.has(norm) || isInvalidPhrase(raw)) continue;

    const canonical = toCanonicalSkill(raw);
    if (!canonical) continue;

    if (seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(DISPLAY_BY_CANONICAL.get(canonical) ?? canonical);
  }

  return out.slice(0, 6);
}

export function formatMissingSkillsCount(count: number, t: (key: string) => string): string {
  if (count <= 0) {
    return t("skillMatch.noMissingShort");
  }
  return t("skillMatch.missingCount").replace(/\{\{count\}\}/g, String(count));
}

/**
 * Single source of truth for skill gap analysis.
 */
export function analyzeSkillGap(
  studentInput: SkillGapStudentInput,
  internship: InternshipSkillSource,
  t?: (key: string) => string
): SkillGapAnalysis {
  const studentCanonical = new Set(mergeStudentCanonicalSkills(studentInput));
  const { skills: internshipSkills, canonicalKeys } = extractInternshipSkills(internship);

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (let i = 0; i < canonicalKeys.length; i++) {
    const canonical = canonicalKeys[i];
    const display = internshipSkills[i] ?? DISPLAY_BY_CANONICAL.get(canonical) ?? canonical;
    if (studentHasCanonical(studentCanonical, canonical)) {
      if (!matchedSkills.includes(display)) {
        matchedSkills.push(display);
      }
    } else if (!missingSkills.includes(display)) {
      missingSkills.push(display);
    }
  }

  const missingSkillsCount = missingSkills.length;
  const learningPlan =
    t && missingSkillsCount > 0 ? generateLearningPlan(missingSkills, t) : [];

  return {
    matchedSkills,
    missingSkills,
    missingSkillsCount,
    learningPlan,
    internshipSkillCount: internshipSkills.length,
    studentSkillCount: studentCanonical.size,
    hasDetectableInternshipSkills: internshipSkills.length > 0,
  };
}

type PlanTemplateKey = "powerBi" | "machineLearning" | "generic";

function resolvePlanTemplateKey(skillNorm: string): PlanTemplateKey {
  if (skillNorm.includes("power bi") || skillNorm.replace(/\s/g, "") === "powerbi") {
    return "powerBi";
  }
  if (
    skillNorm.includes("machine learning") ||
    skillNorm === "ml" ||
    skillNorm.includes("artificial intelligence")
  ) {
    return "machineLearning";
  }
  return "generic";
}

function interpolateSkill(template: string, skill: string): string {
  return template.replace(/\{\{skill\}\}/g, skill);
}

export function generateLearningPlan(
  missingSkills: string[],
  t: (key: string) => string
): LearningPlanEntry[] {
  return missingSkills.map((skill) => {
    const planKey = resolvePlanTemplateKey(normalizeRaw(skill));
    const steps = ["week1", "week2", "week3"].map((week) =>
      interpolateSkill(t(`skillMatch.plans.${planKey}.${week}`), skill)
    );
    return { skill, steps };
  });
}

/** Full analysis including localized learning plan. */
export function analyzeSkillGapWithPlan(
  studentInput: SkillGapStudentInput,
  internship: InternshipSkillSource,
  t: (key: string) => string
): SkillGapAnalysis {
  return analyzeSkillGap(studentInput, internship, t);
}
