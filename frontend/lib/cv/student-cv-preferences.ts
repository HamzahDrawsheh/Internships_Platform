import type { CvProjectSlot, CvSkillCategories } from "@/lib/cv/types";

/** Parsed CV-related fields stored inside students.preferences JSON. */
export type CvStudentPreferences = {
  year: string;
  bio: string;
  summary: string;
  projects: string;
  linkedin: string;
  github: string;
  phone: string;
  certifications: string;
  optionalCoursework: string;
  skillCategories: Partial<CvSkillCategories> | null;
  structuredProjects: CvProjectSlot[] | null;
};

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function readStructuredProjects(value: unknown): CvProjectSlot[] | null {
  if (!Array.isArray(value)) return null;
  const slots = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        name: typeof record.name === "string" ? record.name.trim() : "",
        technologies: typeof record.technologies === "string" ? record.technologies.trim() : "",
        description: typeof record.description === "string" ? record.description.trim() : "",
        achievements: typeof record.achievements === "string" ? record.achievements.trim() : "",
        link: typeof record.link === "string" ? record.link.trim() : "",
      };
    })
    .filter((slot): slot is CvProjectSlot => slot != null);
  return slots.length ? slots : null;
}

function readSkillCategories(value: unknown): Partial<CvSkillCategories> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const out: Partial<CvSkillCategories> = {};
  for (const [key, val] of Object.entries(record)) {
    if (typeof val === "string" && val.trim()) {
      out[key as keyof CvSkillCategories] = val.trim();
    }
  }
  return Object.keys(out).length ? out : null;
}

const EMPTY_PREFS: CvStudentPreferences = {
  year: "",
  bio: "",
  summary: "",
  projects: "",
  linkedin: "",
  github: "",
  phone: "",
  certifications: "",
  optionalCoursework: "",
  skillCategories: null,
  structuredProjects: null,
};

export function parseCvStudentPreferences(raw: unknown): CvStudentPreferences {
  if (raw == null) {
    return { ...EMPTY_PREFS };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { ...EMPTY_PREFS };
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parseCvStudentPreferences(parsed);
      }
    } catch {
      return { ...EMPTY_PREFS, bio: trimmed };
    }
    return { ...EMPTY_PREFS };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_PREFS };
  }

  const obj = raw as Record<string, unknown>;
  return {
    year: readString(obj, "year", "academic_year", "academicYear"),
    bio: readString(obj, "bio", "experience"),
    summary: readString(obj, "summary", "cv_summary"),
    projects: readString(obj, "projects", "project"),
    linkedin: readString(obj, "linkedin"),
    github: readString(obj, "github", "github_portfolio", "githubPortfolio"),
    phone: readString(obj, "phone"),
    certifications: readString(obj, "certifications", "certificates"),
    optionalCoursework: readString(obj, "optionalCoursework", "coursework"),
    skillCategories: readSkillCategories(obj.skillCategories),
    structuredProjects: readStructuredProjects(obj.structuredProjects),
  };
}

export function buildCvPreferencesPayload(
  existingRaw: unknown,
  input: {
    experience: string;
    summary: string;
    projects: string;
    linkedin: string;
    githubPortfolio: string;
    phone: string;
    certifications?: string;
    expectedGraduation?: string;
    optionalCoursework?: string;
    skillCategories?: Partial<CvSkillCategories> | null;
    structuredProjects?: CvProjectSlot[] | null;
  },
): string | null {
  const existing = parseCvStudentPreferences(existingRaw);
  const payload: Record<string, unknown> = {
    year: input.expectedGraduation?.trim() || existing.year || null,
    bio: input.experience.trim() || null,
    summary: input.summary.trim() || null,
    projects: input.projects.trim() || null,
    linkedin: input.linkedin.trim() || null,
    github: input.githubPortfolio.trim() || null,
    phone: input.phone.trim() || null,
    certifications: input.certifications?.trim() || null,
    optionalCoursework: input.optionalCoursework?.trim() || null,
    skillCategories: input.skillCategories ?? null,
    structuredProjects: input.structuredProjects ?? null,
  };

  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => {
      if (v == null || v === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0) {
        return false;
      }
      return true;
    }),
  );

  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
}

export function parseCsv(input: string): string[] {
  return input
    .split(/[,;\n|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
