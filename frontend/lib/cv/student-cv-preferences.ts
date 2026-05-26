/** Parsed CV-related fields stored inside students.preferences JSON. */
export type CvStudentPreferences = {
  year: string;
  bio: string;
  summary: string;
  projects: string;
  linkedin: string;
  github: string;
  phone: string;
};

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export function parseCvStudentPreferences(raw: unknown): CvStudentPreferences {
  if (raw == null) {
    return { year: "", bio: "", summary: "", projects: "", linkedin: "", github: "", phone: "" };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { year: "", bio: "", summary: "", projects: "", linkedin: "", github: "", phone: "" };
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parseCvStudentPreferences(parsed);
      }
    } catch {
      return { year: "", bio: trimmed, summary: "", projects: "", linkedin: "", github: "", phone: "" };
    }
    return { year: "", bio: "", summary: "", projects: "", linkedin: "", github: "", phone: "" };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { year: "", bio: "", summary: "", projects: "", linkedin: "", github: "", phone: "" };
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
  },
): string | null {
  const existing = parseCvStudentPreferences(existingRaw);
  const payload: Record<string, string | null> = {
    year: existing.year || null,
    bio: input.experience.trim() || null,
    summary: input.summary.trim() || null,
    projects: input.projects.trim() || null,
    linkedin: input.linkedin.trim() || null,
    github: input.githubPortfolio.trim() || null,
    phone: input.phone.trim() || null,
  };

  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v != null && v !== ""),
  );

  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
}

export function parseCsv(input: string): string[] {
  return input
    .split(/[,;\n|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
