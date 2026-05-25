/**
 * Rule-based, deterministic helpers for internship match explanations.
 * No network calls; safe to unit test.
 */

export type MatchInsights = {
  matched_skills: string[];
  gaps: string[];
  summary_lines: string[];
  tips: string[];
};

const MAX_MATCHED_SKILLS = 6;
const MAX_GAPS = 5;

/** Split free-form skill lists on common separators (comma, semicolon, newline, pipe). */
const SKILL_DELIMITERS = /[,;\n|]+/;

/** Student/profile text: allow longer course names and phrases. */
/** Posting descriptions: tight caps to drop sentences and prose blobs. */
type TokenizeMode = "student" | "posting";

const MODE_LIMITS: Record<TokenizeMode, { maxChars: number; maxWords: number; minChars: number }> = {
  student: { maxChars: 80, maxWords: 12, minChars: 2 },
  posting: { maxChars: 42, maxWords: 5, minChars: 2 },
};

/**
 * Obvious non-skill / filler phrases in internship prose (lowercase substring match).
 * Applied only in posting mode so student course titles stay unaffected.
 */
const POSTING_STOP_SUBSTRINGS: readonly string[] = [
  "your responsibility",
  "your responsibilities",
  "you will be",
  "you will ",
  "you must",
  "you should",
  "we are looking",
  "we're looking",
  "looking for",
  "ideal candidate",
  "join our",
  "about us",
  "about the company",
  "about the role",
  "what you will",
  "what we offer",
  "this internship",
  "this role",
  "this position",
  "responsibilities include",
  "required qualifications",
  "preferred qualifications",
  "nice to have",
  "bonus points",
  "strong communication",
  "team player",
  "self-motivated",
  "self motivated",
  "detail-oriented",
  "detail oriented",
  "ability to work",
  "work independently",
  "fast-paced",
  "fast paced",
  "equal opportunity",
  "remotely across",
  "if you are",
  "who are passionate",
];

/** Exact tokens that must never appear as skill gaps (posting prose fragments). */
const POSTING_TOKEN_BLOCKLIST = new Set([
  "nothing",
  "something",
  "anything",
  "everything",
  "none",
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
]);

export type TokenizeSkillsOptions = {
  mode?: TokenizeMode;
};

function normalizeToken(raw: string): string {
  return raw.trim().toLowerCase();
}

function wordCount(t: string): number {
  return t.trim().split(/\s+/).filter(Boolean).length;
}

function isLikelySkillToken(t: string, mode: TokenizeMode): boolean {
  const { maxChars, maxWords, minChars } = MODE_LIMITS[mode];
  if (t.length < minChars || t.length > maxChars) {
    return false;
  }
  const wc = wordCount(t);
  if (wc < 1 || wc > maxWords) {
    return false;
  }
  if (/^\d+$/.test(t)) {
    return false;
  }
  if (POSTING_TOKEN_BLOCKLIST.has(t)) {
    return false;
  }
  if (mode === "posting") {
    for (const stop of POSTING_STOP_SUBSTRINGS) {
      if (t.includes(stop)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Break oversized posting chunks once using lightweight delimiters (no NLP).
 * Returns [] when nothing splits (caller drops the blob).
 */
function explodeOversizedChunk(chunk: string): string[] {
  const t = normalizeToken(chunk);
  if (!t) {
    return [];
  }
  const splits = t
    .split(/\.\s+/)
    .flatMap((p) => p.split(/\s*;\s*/))
    .flatMap((p) => p.split(/\s*,\s+/))
    .flatMap((p) => p.split(/\s+(?:and|or)\s+/i))
    .map(normalizeToken)
    .filter(Boolean);

  const dedupedFirstPass = dedupePreserveOrder(splits);
  if (dedupedFirstPass.length <= 1 && dedupedFirstPass[0] === t) {
    return [];
  }
  return dedupedFirstPass;
}

function refineTokens(rawPieces: string[], mode: TokenizeMode): string[] {
  const out: string[] = [];
  for (const piece of rawPieces) {
    const t = normalizeToken(piece);
    if (!t) {
      continue;
    }
    if (isLikelySkillToken(t, mode)) {
      out.push(t);
      continue;
    }
    const exploded = mode === "posting" ? explodeOversizedChunk(t) : [];
    const candidates = exploded.length > 0 ? exploded : [];
    for (const c of candidates) {
      const x = normalizeToken(c);
      if (x && isLikelySkillToken(x, mode)) {
        out.push(x);
      }
    }
  }
  return out;
}

function dedupePreserveOrder(tokens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function splitDelimitedString(s: string, mode: TokenizeMode): string[] {
  const raw = s
    .split(SKILL_DELIMITERS)
    .map((x) => normalizeToken(x))
    .filter(Boolean);
  return refineTokens(raw, mode);
}

/**
 * Normalize skill-like tokens from a string, array, null, or undefined.
 * - lowercase, trim, drop empties, dedupe (first occurrence wins)
 * - Strings: split on commas/semicolons/newlines/pipes
 * - Arrays: each element trimmed; if an element still contains delimiters, split it further
 * - `options.mode`: `"posting"` applies stricter caps + stop phrases + chunk splitting for noisy prose
 */
export function tokenizeSkills(
  input: string | string[] | null | undefined,
  options?: TokenizeSkillsOptions
): string[] {
  const mode = options?.mode ?? "student";

  if (input == null) {
    return [];
  }

  if (Array.isArray(input)) {
    const parts: string[] = [];
    for (const el of input) {
      if (typeof el !== "string") {
        continue;
      }
      const trimmed = el.trim();
      if (!trimmed) {
        continue;
      }
      if (SKILL_DELIMITERS.test(trimmed)) {
        parts.push(...splitDelimitedString(trimmed, mode));
      } else {
        parts.push(...refineTokens([trimmed], mode));
      }
    }
    return dedupePreserveOrder(parts);
  }

  const s = input.trim();
  if (!s) {
    return [];
  }
  return dedupePreserveOrder(splitDelimitedString(s, mode));
}

export type StudentSkillSources = {
  skills?: string | null;
  technical_skills?: string[] | null;
  soft_skills?: string[] | null;
  taken_courses?: string[] | null;
  custom_courses?: string[] | null;
  preferred_field?: string | null;
};

/**
 * Single student-side token set used for overlap against a posting.
 */
export function mergeStudentSkillSources(input: StudentSkillSources): string[] {
  const merged: string[] = [
    ...tokenizeSkills(input.skills ?? undefined, { mode: "student" }),
    ...tokenizeSkills(input.technical_skills ?? undefined, { mode: "student" }),
    ...tokenizeSkills(input.soft_skills ?? undefined, { mode: "student" }),
    ...tokenizeSkills(input.taken_courses ?? undefined, { mode: "student" }),
    ...tokenizeSkills(input.custom_courses ?? undefined, { mode: "student" }),
    ...tokenizeSkills(input.preferred_field ?? undefined, { mode: "student" }),
  ];
  return dedupePreserveOrder(merged);
}

/** Posting-side tokens: requirements first, then description (order preserved for caps). */
function orderedPostingTokens(
  requirements: string | null | undefined,
  description: string | null | undefined
): string[] {
  return dedupePreserveOrder([
    ...tokenizeSkills(requirements ?? undefined, { mode: "posting" }),
    ...tokenizeSkills(description ?? undefined, { mode: "posting" }),
  ]);
}

export type BuildMatchInsightsArgs = {
  studentSources: StudentSkillSources;
  internshipTitle: string;
  internshipRequirements: string | null | undefined;
  internshipDescription: string | null | undefined;
  /** Display value 0–100 (e.g. existing match_percentage). */
  matchPercentage: number;
};

/**
 * Build grounded insight bullets from structured fields only.
 * Title is used for labeling only, not tokenized as skills (reduces noise like "intern").
 */
export function buildMatchInsights(args: BuildMatchInsightsArgs): MatchInsights {
  const studentSet = new Set(mergeStudentSkillSources(args.studentSources));
  const postingOrdered = orderedPostingTokens(args.internshipRequirements, args.internshipDescription);

  const matched_skills: string[] = [];
  for (const t of postingOrdered) {
    if (studentSet.has(t) && !matched_skills.includes(t) && matched_skills.length < MAX_MATCHED_SKILLS) {
      matched_skills.push(t);
    }
  }

  const gaps: string[] = [];
  for (const t of postingOrdered) {
    if (!studentSet.has(t) && !gaps.includes(t) && gaps.length < MAX_GAPS) {
      gaps.push(t);
    }
  }

  const meaningfulGaps = gaps.filter((g) => isLikelySkillToken(g, "posting"));

  const pct = Math.round(Math.max(0, Math.min(100, Number(args.matchPercentage) || 0)));
  const title = typeof args.internshipTitle === "string" ? args.internshipTitle.trim() : "";
  const summary_lines: string[] = [];

  summary_lines.push(
    `Semantic profile match: ${pct}% (based on embeddings over your profile and this listing’s text).`
  );

  if (title) {
    summary_lines.push(`Listing: ${title}.`);
  }

  if (postingOrdered.length === 0) {
    summary_lines.push(
      "This posting has little or no structured skill text in requirements/description; overlap lists may be empty."
    );
  } else if (matched_skills.length > 0) {
    summary_lines.push(
      `Direct textual overlap: ${matched_skills.length} skill keyword(s) from the posting also appear in your profile sources (capped for display).`
    );
  } else {
    summary_lines.push(
      "No overlapping skill keywords were found between your listed skills and this posting’s requirement/description text (the score may still reflect broader semantic similarity)."
    );
  }

  const tips: string[] = meaningfulGaps.map(
    (g) =>
      `Add or surface "${g}" in your profile if it reflects your experience—recruiters filter on explicit keywords.`
  );

  return {
    matched_skills,
    gaps: meaningfulGaps,
    summary_lines,
    tips,
  };
}
