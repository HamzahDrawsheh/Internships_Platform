/** Shared CV text formatting for PDF export and live preview. */

const SKILL_LABELS: Record<string, string> = {
  python: "Python",
  sql: "SQL",
  "c++": "C++",
  java: "Java",
  javascript: "JavaScript",
  typescript: "TypeScript",
  ai: "AI",
  ml: "ML",
  nlp: "NLP",
  "machine learning": "Machine Learning",
  "deep learning": "Deep Learning",
  "data analysis": "Data Analysis",
  "big data": "Big Data",
  "business intelligence": "Business Intelligence",
  react: "React",
  "next.js": "Next.js",
  node: "Node.js",
  communication: "Communication",
};

export type ParsedEducation = {
  department: string;
  gpa: string;
  courses: string[];
  extraLines: string[];
};

export function trimMax(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function toDisplayName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 2 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

export function toDisplayPlace(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.length <= 3 && t === t.toUpperCase()) return t;
  return toDisplayName(t);
}

export function toDisplayInstitution(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.length <= 5 && t === t.toUpperCase()) return t;
  return t
    .split(/\s+/)
    .map((w) => (w.length <= 4 && w === w.toUpperCase() ? w : toDisplayName(w)))
    .join(" ");
}

export function formatSkillLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (!key) return "";
  if (SKILL_LABELS[key]) return SKILL_LABELS[key];
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => {
      const lk = w.toLowerCase();
      if (SKILL_LABELS[lk]) return SKILL_LABELS[lk];
      if (w.length <= 4 && w === w.toUpperCase()) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

export function parseSkillsList(raw: string): string[] {
  const parts = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const label = formatSkillLabel(p);
    const key = label.toLowerCase();
    if (label && !seen.has(key)) {
      seen.add(key);
      out.push(label);
    }
  }
  return out;
}

export function formatCourseLabel(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/\blearining\b/gi, "Learning")
    .replace(/\s+/g, " ");

  return cleaned
    .split(" ")
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && ["to", "of", "and", "in", "for", "the", "a", "an"].includes(lower)) return lower;
      if (w.length <= 4 && w === w.toUpperCase()) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

export function parseCoursesFromText(text: string): string[] {
  const idx = text.search(/courses\s*:/i);
  if (idx === -1) return [];
  const tailStart = text.indexOf(":", idx) + 1;
  const tail = text.slice(tailStart).trim();
  return tail
    .split(/[,;\n]+/)
    .map((c) => formatCourseLabel(c))
    .filter(Boolean);
}

export function parseEducationFields(raw: string): ParsedEducation {
  const department =
    raw.match(/^\s*department\s*:\s*(.+)$/im)?.[1]?.trim() ??
    raw.match(/department\s*:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() ??
    "";
  const gpa =
    raw.match(/^\s*gpa\s*:\s*([\d.]+)/im)?.[1]?.trim() ??
    raw.match(/gpa\s*:\s*([\d.]+)/i)?.[1]?.trim() ??
    "";

  const courses = parseCoursesFromText(raw);

  const extraLines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (/^university\s*:/i.test(l)) return false;
      if (/^major\s*:/i.test(l)) return false;
      if (/^department\s*:/i.test(l)) return false;
      if (/^gpa\s*:/i.test(l)) return false;
      if (/^courses\s*:/i.test(l)) return false;
      return true;
    });

  return { department, gpa, courses, extraLines };
}

export function experienceToBullets(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((l) => l.replace(/^[\s•\-*–]+/, "").trim())
    .filter(Boolean)
    .map((l) => trimMax(l, 500));
}

export function parseProjectBlocks(raw: string): { title: string; body: string }[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split(/\n/).map((l) => l.trim()).filter(Boolean);
      const title = trimMax(lines[0] ?? "", 100);
      const body = trimMax(lines.slice(1).join("\n"), 900);
      return { title, body };
    });
}

export function buildEducationHeadline(university: string, major: string): string {
  const uni = toDisplayInstitution(university);
  const maj = major.trim();
  if (uni && maj) return `${uni} — ${maj}`;
  return uni || maj;
}

export type CvDisplayModel = {
  displayName: string;
  contactLine: string;
  linksLine: string;
  summary: string;
  educationHeadline: string;
  department: string;
  gpa: string;
  courses: string[];
  educationExtra: string[];
  skills: string[];
  experienceBullets: string[];
  projects: { title: string; body: string }[];
};

export function buildCvDisplayModel(f: {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  summary: string;
  university: string;
  major: string;
  education: string;
  skills: string;
  experience: string;
  projects: string;
  linkedin: string;
  githubPortfolio: string;
  department?: string;
}): CvDisplayModel {
  const parsed = parseEducationFields(f.education);
  const department = f.department?.trim() || parsed.department;

  const contactBits = [
    f.email.trim(),
    f.phone.trim(),
    f.city.trim() ? toDisplayPlace(f.city) : "",
  ].filter(Boolean);

  const linkBits = [f.linkedin.trim(), f.githubPortfolio.trim()].filter(Boolean);

  return {
    displayName: toDisplayName(f.fullName.trim() || "Applicant"),
    contactLine: contactBits.join("  ·  "),
    linksLine: linkBits.join("  ·  "),
    summary: f.summary.trim(),
    educationHeadline: buildEducationHeadline(f.university, f.major),
    department: department ? toDisplayInstitution(department) : "",
    gpa: parsed.gpa,
    courses: parsed.courses,
    educationExtra: parsed.extraLines,
    skills: parseSkillsList(f.skills),
    experienceBullets: experienceToBullets(f.experience),
    projects: parseProjectBlocks(f.projects),
  };
}
