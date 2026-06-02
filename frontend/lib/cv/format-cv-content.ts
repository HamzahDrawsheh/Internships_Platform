/** Shared CV text formatting for PDF export and live preview. */

import {
  CV_SKILL_CATEGORY_KEYS,
  CV_SKILL_CATEGORY_LABELS,
  type CvSkillCategories,
} from "@/lib/cv/types";
import { mergeSkillCategories, parseSkillCategoriesFromText } from "@/lib/cv/cv-field-serialization";

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

export type CvProjectDisplay = {
  title: string;
  technologies: string;
  description: string;
  bullets: string[];
  link: string;
};

export function parseProjectBlocks(raw: string): CvProjectDisplay[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split(/\n/).map((l) => l.trim()).filter(Boolean);
      const title = trimMax(lines[0] ?? "", 100);
      let technologies = "";
      let link = "";
      const bullets: string[] = [];
      const descriptionLines: string[] = [];

      for (const line of lines.slice(1)) {
        const techMatch = /^technologies\s*:\s*(.+)$/i.exec(line);
        const linkMatch = /^link\s*:\s*(.+)$/i.exec(line);
        const bulletMatch = /^[•\-*–]\s*(.+)$/.exec(line);
        if (techMatch) technologies = trimMax(techMatch[1], 200);
        else if (linkMatch) link = trimMax(linkMatch[1], 200);
        else if (bulletMatch) bullets.push(trimMax(bulletMatch[1], 500));
        else descriptionLines.push(line);
      }

      return {
        title,
        technologies,
        description: trimMax(descriptionLines.join("\n"), 900),
        bullets,
        link,
      };
    });
}

export function buildSkillCategoryLines(
  categories: CvSkillCategories | undefined,
  legacySkills: string
): { label: string; values: string }[] {
  const merged = categories
    ? mergeSkillCategories(categories)
    : parseSkillCategoriesFromText(legacySkills);

  return CV_SKILL_CATEGORY_KEYS.map((key) => ({
    label: CV_SKILL_CATEGORY_LABELS[key],
    values: merged[key]?.trim() ?? "",
  })).filter((line) => line.values);
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
  summary: string;
  skillCategoryLines: { label: string; values: string }[];
  projects: CvProjectDisplay[];
  experienceBullets: string[];
  educationUniversity: string;
  educationDegreeLine: string;
  educationGpa: string;
  educationGraduation: string;
  educationDepartment: string;
  coursework: string[];
  certifications: string[];
  linksLine: string;
};

function parseCertificationLines(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-*–]+/, "").trim())
    .filter(Boolean)
    .map((line) => trimMax(line, 200));
}

function parseOptionalCoursework(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((c) => formatCourseLabel(c))
    .filter(Boolean);
}

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
  gpa?: string;
  expectedGraduation?: string;
  optionalCoursework?: string;
  certifications?: string;
  skillCategories?: CvSkillCategories;
}): CvDisplayModel {
  const parsed = parseEducationFields(f.education);
  const department = f.department?.trim() || parsed.department;

  const contactBits = [
    f.email.trim(),
    f.phone.trim(),
    f.city.trim() ? toDisplayPlace(f.city) : "",
  ].filter(Boolean);

  const linkBits = [f.linkedin.trim(), f.githubPortfolio.trim()].filter(Boolean);

  const gpa = f.gpa?.trim() || parsed.gpa;
  const graduation = f.expectedGraduation?.trim() || "";
  const courseworkSource = f.optionalCoursework?.trim() || "";
  const coursework = courseworkSource
    ? parseOptionalCoursework(courseworkSource)
    : parsed.courses;

  const uni = toDisplayInstitution(f.university.trim());
  const major = f.major.trim();
  let degreeLine = "";
  if (major) {
    degreeLine = /degree|bachelor|master|diploma/i.test(major)
      ? major
      : `Bachelor's Degree in ${major}`;
  }

  return {
    displayName: toDisplayName(f.fullName.trim() || "Applicant"),
    contactLine: contactBits.join("  ·  "),
    summary: f.summary.trim(),
    skillCategoryLines: buildSkillCategoryLines(f.skillCategories, f.skills),
    projects: parseProjectBlocks(f.projects),
    experienceBullets: experienceToBullets(f.experience),
    educationUniversity: uni,
    educationDegreeLine: degreeLine,
    educationGpa: gpa,
    educationGraduation: graduation,
    educationDepartment: department ? toDisplayInstitution(department) : "",
    coursework,
    certifications: parseCertificationLines(f.certifications ?? ""),
    linksLine: linkBits.join("  ·  "),
  };
}
