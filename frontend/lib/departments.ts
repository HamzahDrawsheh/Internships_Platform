/**
 * Canonical academic departments — must match
 * `public.is_valid_academic_department` in Supabase migrations.
 */
export const ACADEMIC_DEPARTMENTS = [
  "Computer Science",
  "Computer Information Systems",
  "Software Engineering",
] as const;

export type AcademicDepartment = (typeof ACADEMIC_DEPARTMENTS)[number];

export function isValidDepartment(value: unknown): value is AcademicDepartment {
  return typeof value === "string" && (ACADEMIC_DEPARTMENTS as readonly string[]).includes(value);
}

/** Lowercase keys: common abbreviations and legacy names → canonical label. */
const DEPARTMENT_ALIAS_TO_CANONICAL: Record<string, AcademicDepartment> = {
  "computer science": "Computer Science",
  cs: "Computer Science",
  "c.s": "Computer Science",
  "c.s.": "Computer Science",
  "comp sci": "Computer Science",
  "comp-sci": "Computer Science",
  compscience: "Computer Science",
  "computing science": "Computer Science",
  "software engineering": "Software Engineering",
  se: "Software Engineering",
  swe: "Software Engineering",
  "sw eng": "Software Engineering",
  "software eng": "Software Engineering",
  "computer information systems": "Computer Information Systems",
  "computer information system": "Computer Information Systems",
  "comp info systems": "Computer Information Systems",
  "comp info system": "Computer Information Systems",
  cis: "Computer Information Systems",
  "c.i.s": "Computer Information Systems",
  "c.i.s.": "Computer Information Systems",
  "info systems": "Computer Information Systems",
  "information systems": "Computer Information Systems",
  // Legacy: previous canonical names and abbreviations (same matching logic; value maps to a current dept)
  "information technology": "Computer Information Systems",
  it: "Computer Information Systems",
  "i.t": "Computer Information Systems",
  "i.t.": "Computer Information Systems",
  "info tech": "Computer Information Systems",
  infotech: "Computer Information Systems",
  "cyber security": "Computer Science",
  cybersecurity: "Computer Science",
  cyber: "Computer Science",
  infosec: "Computer Science",
  "information security": "Computer Science",
  "data science": "Computer Science",
  ds: "Computer Science",
  "data-science": "Computer Science",
  "artificial intelligence": "Computer Science",
  ai: "Computer Science",
  "a.i": "Computer Science",
  "a.i.": "Computer Science",
};

/**
 * Map legacy free-text or abbreviations to a canonical department, or null if unknown.
 * Does not default to a department — use for hydrating forms; pair with isValidDepartment or a default.
 */
export function normalizeDepartmentAlias(raw: unknown): AcademicDepartment | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if ((ACADEMIC_DEPARTMENTS as readonly string[]).includes(trimmed)) {
    return trimmed as AcademicDepartment;
  }
  const key = trimmed.toLowerCase().replace(/\s+/g, " ");
  return DEPARTMENT_ALIAS_TO_CANONICAL[key] ?? null;
}

/** For <Select>: first option should use value "" when a blank placeholder is needed. */
export const academicDepartmentSelectOptions: { value: AcademicDepartment; label: string }[] =
  ACADEMIC_DEPARTMENTS.map((d) => ({ value: d, label: d }));
