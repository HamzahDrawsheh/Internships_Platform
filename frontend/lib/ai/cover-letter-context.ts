export type CoverLetterLocale = "en" | "ar";

export type CoverLetterStudentContext = {
  fullName: string;
  university: string;
  major: string;
  department: string;
  academicYear: string;
  gpa: string | null;
  skillsFromProfile: string;
  technicalSkills: string[];
  softSkills: string[];
  courses: string[];
  projects: string;
  bioOrExperience: string;
};

export type CoverLetterInternshipContext = {
  title: string;
  companyName: string;
  description: string;
  requirements: string;
  additionalNotes: string;
};

export type CoverLetterContextUsed = {
  internshipTitle: string;
  companyName: string;
  skills: string;
  courses: string;
  projects: string;
};

function normalizeList(items: string[]): string {
  return items.map((s) => s.trim()).filter(Boolean).join(", ");
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function parseStudentPreferences(raw: unknown): {
  projects: string;
  academicYear: string;
  bio: string;
} {
  if (raw == null) {
    return { projects: "", academicYear: "", bio: "" };
  }
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        obj = parsed as Record<string, unknown>;
      }
    } catch {
      return { projects: "", academicYear: "", bio: raw.trim() };
    }
  } else if (typeof raw === "object" && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  }
  if (!obj) {
    return { projects: "", academicYear: "", bio: "" };
  }
  const projects =
    typeof obj.projects === "string"
      ? obj.projects
      : typeof obj.project === "string"
        ? obj.project
        : "";
  const academicYear =
    typeof obj.year === "string"
      ? obj.year
      : typeof obj.academic_year === "string"
        ? obj.academic_year
        : typeof obj.academicYear === "string"
          ? obj.academicYear
          : "";
  const bio =
    typeof obj.bio === "string"
      ? obj.bio
      : typeof obj.experience === "string"
        ? obj.experience
        : "";
  return {
    projects: projects.trim(),
    academicYear: academicYear.trim(),
    bio: bio.trim(),
  };
}

export function isProfileIncomplete(student: CoverLetterStudentContext): boolean {
  const hasName = student.fullName.length > 0;
  const hasSchool = student.university.length > 0 || student.major.length > 0;
  const hasSkills =
    student.technicalSkills.length > 0 ||
    student.softSkills.length > 0 ||
    Boolean(student.skillsFromProfile.trim());
  return !(hasName && hasSchool && hasSkills);
}

export function buildContextUsedSummary(
  student: CoverLetterStudentContext,
  internship: CoverLetterInternshipContext
): CoverLetterContextUsed {
  const skillParts = [
    ...student.technicalSkills,
    ...student.softSkills,
    student.skillsFromProfile,
  ].filter(Boolean);
  const uniqueSkills = [...new Set(skillParts.map((s) => s.trim()).filter(Boolean))];

  return {
    internshipTitle: internship.title,
    companyName: internship.companyName,
    skills: uniqueSkills.length ? normalizeList(uniqueSkills) : "—",
    courses: student.courses.length ? normalizeList(student.courses) : "—",
    projects: student.projects.trim() || "—",
  };
}

export function buildCoverLetterUserPrompt(
  student: CoverLetterStudentContext,
  internship: CoverLetterInternshipContext,
  locale: CoverLetterLocale
): string {
  const languageInstruction =
    locale === "ar"
      ? "Write the entire cover letter in Modern Standard Arabic."
      : "Write the entire cover letter in English.";

  const sections: string[] = [
    languageInstruction,
    "Target length: 180–250 words. Output plain text only (no markdown, no subject line unless natural).",
    "",
    "=== STUDENT ===",
    `Full name: ${student.fullName || "(not provided)"}`,
    `University: ${student.university || "(not provided)"}`,
    `Major: ${student.major || "(not provided)"}`,
    `Department: ${student.department || "(not provided)"}`,
    `Academic year: ${student.academicYear || "(not provided)"}`,
  ];

  if (student.gpa) {
    sections.push(`GPA: ${student.gpa}`);
  }

  const allSkills = [
    ...student.technicalSkills,
    ...student.softSkills,
    student.skillsFromProfile,
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  const uniqueSkills = [...new Set(allSkills)];
  sections.push(`Technical / professional skills: ${uniqueSkills.length ? uniqueSkills.join(", ") : "(none listed)"}`);

  if (student.courses.length) {
    sections.push(`Relevant courses: ${student.courses.join(", ")}`);
  }

  if (student.projects.trim()) {
    sections.push(`Projects: ${student.projects.trim()}`);
  }

  if (student.bioOrExperience.trim()) {
    sections.push(`Background / experience notes: ${student.bioOrExperience.trim()}`);
  }

  sections.push(
    "",
    "=== INTERNSHIP ===",
    `Title: ${internship.title}`,
    `Company: ${internship.companyName}`,
    `Description: ${internship.description || "(not provided)"}`,
    `Requirements / skills: ${internship.requirements || "(not provided)"}`
  );

  if (internship.additionalNotes.trim()) {
    sections.push(`Additional notes: ${internship.additionalNotes}`);
  }

  const formatBlock =
    locale === "ar"
      ? [
          "",
          "=== REQUIRED OUTPUT FORMAT (Arabic) ===",
          "Start the letter immediately with the greeting line (no header, no date, no address, no contact info):",
          "السادة فريق التوظيف المحترمين،",
          `OR use the company name: السادة فريق التوظيف في ${internship.companyName} المحترمين،`,
          "",
          "Then write 2–4 short paragraphs (180–250 words total) expressing interest in the internship.",
          "",
          "End with exactly:",
          "مع الاحترام،",
          student.fullName.trim() || "طالب",
          "",
          "FORBIDDEN: [Your Name], [Your Address], [City, State, Zip], [Email Address], [Phone Number], [Date], or any text in square brackets used as placeholders.",
          "FORBIDDEN: letterhead blocks, mailing addresses, phone numbers, email addresses, and date lines.",
        ]
      : [
          "",
          "=== REQUIRED OUTPUT FORMAT (English) ===",
          "Start the letter immediately with the greeting line (no header, no date, no address, no contact info):",
          `Dear Hiring Team at ${internship.companyName},`,
          "OR: Dear Hiring Team,",
          "",
          "Then write 2–4 short paragraphs (180–250 words total) expressing interest in the internship.",
          "",
          "End with exactly:",
          "Sincerely,",
          student.fullName.trim() || "Student",
          "",
          "FORBIDDEN: [Your Name], [Your Address], [City, State, Zip], [Email Address], [Phone Number], [Date], or any text in square brackets used as placeholders.",
          "FORBIDDEN: letterhead blocks, mailing addresses, phone numbers, email addresses, and date lines.",
        ];

  sections.push(...formatBlock);

  return sections.join("\n");
}

export const COVER_LETTER_SYSTEM_PROMPT =
  "You are an assistant that writes professional internship cover letters for university students. " +
  "Use only the provided student and internship data. Do not invent experience, projects, skills, GPA, or achievements. " +
  "Keep the tone professional, confident, and concise. Do not exaggerate claims. " +
  "Output plain text only: start directly with the greeting line, then the body, then the closing signature. " +
  "Never include letterhead, mailing addresses, city/state/zip lines, email, phone, dates, or bracket placeholders such as [Your Name]. " +
  "Use the student's real name in the closing when provided; otherwise use 'Student' (English) or 'طالب' (Arabic). " +
  "The letter must be ready to copy without any fields the student must fill in manually.";

/** Lines to drop from model output (accidental templates / letterhead). */
const PLACEHOLDER_LINE_PATTERNS: RegExp[] = [
  /^\s*\[/,
  /\bYour\s+Name\b/i,
  /\bYour\s+Address\b/i,
  /\bCity,\s*State\b/i,
  /\bState,\s*Zip\b/i,
  /\bEmail\s+Address\b/i,
  /\bPhone\s+Number\b/i,
  /^\s*\[?Date\]?\s*$/i,
  /^\s*Date:\s*\[?/i,
  /\[Your\s+Name\]/i,
  /\[Your\s+Address\]/i,
  /\[City,\s*State/i,
  /\[Email\s+Address\]/i,
  /\[Phone\s+Number\]/i,
  /\[Date\]/i,
  /^@\s*[\w.-]+\.\w+/i,
  /^\+?\d[\d\s().-]{7,}\d\s*$/,
];

function shouldRemoveCoverLetterLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (PLACEHOLDER_LINE_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (/^\[[^\]]+\]\s*,?\s*$/.test(trimmed)) return true;
  if (
    /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\s*$/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (/^\d{1,2}\s+\w+\s+\d{4}\s*$/i.test(trimmed)) return true;
  return false;
}

export function sanitizeCoverLetterText(raw: string): string {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    if (shouldRemoveCoverLetterLine(line)) continue;
    kept.push(line);
  }
  let text = kept.join("\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function stripTrailingSignature(text: string, locale: CoverLetterLocale): string {
  const pattern =
    locale === "ar"
      ? /\n\s*مع\s+الاحترام\s*,?\s*[\s\S]*$/i
      : /\n\s*Sincerely\s*,?\s*[\s\S]*$/i;
  return text.replace(pattern, "").trim();
}

export function finalizeCoverLetterOutput(
  raw: string,
  locale: CoverLetterLocale,
  studentFullName: string
): string {
  let text = sanitizeCoverLetterText(raw);
  text = stripTrailingSignature(text, locale);

  const name = studentFullName.trim();
  if (locale === "ar") {
    const signature = name || "طالب";
    return `${text}\n\nمع الاحترام،\n${signature}`.trim();
  }
  const signature = name || "Student";
  return `${text}\n\nSincerely,\n${signature}`.trim();
}
