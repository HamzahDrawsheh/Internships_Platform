import type { SupabaseClient } from "@supabase/supabase-js";

export type CompanyEvaluationSummary = {
  is_new_company: boolean;
  evaluation_enabled: boolean;
  avg_score: number | null;
  avg_rating: number | null;
  total_feedbacks: number;
  company_level: "white" | "gray" | "black" | null;
  company_score: number | null;
  acceptance_ratio_pct: number | null;
  completion_rate_pct: number | null;
  total_offered_internships: number;
  total_accepted_students: number;
  completed_internships: number;
};

/** Normalize RPC payload: PostgREST may return `json` as a parsed object or a JSON string. */
function unwrapRpcJsonPayload(data: unknown): unknown {
  if (typeof data === "string") {
    const t = data.trim();
    if (!t) return null;
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return null;
    }
  }
  return data;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readNonNegativeInt(value: unknown, fallback = 0): number {
  const n = readFiniteNumber(value);
  if (n == null || n < 0) return fallback;
  return Math.floor(n);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function parseCompanyEvaluationRpc(data: unknown): CompanyEvaluationSummary | null {
  const unwrapped = unwrapRpcJsonPayload(data);
  if (unwrapped == null || typeof unwrapped !== "object") return null;
  const o = unwrapped as Record<string, unknown>;

  const rawLevel = o.company_level;
  let company_level: CompanyEvaluationSummary["company_level"] = null;
  if (typeof rawLevel === "string") {
    const k = rawLevel.trim().toLowerCase();
    if (k === "white" || k === "gray" || k === "black") company_level = k;
  }

  return {
    is_new_company: readBoolean(o.is_new_company, true),
    evaluation_enabled: readBoolean(o.evaluation_enabled, false),
    avg_score: readFiniteNumber(o.avg_score),
    avg_rating: readFiniteNumber(o.avg_rating),
    total_feedbacks: readNonNegativeInt(o.total_feedbacks),
    company_level,
    company_score: readFiniteNumber(o.company_score),
    acceptance_ratio_pct: readFiniteNumber(o.acceptance_ratio_pct),
    completion_rate_pct: readFiniteNumber(o.completion_rate_pct),
    total_offered_internships: readNonNegativeInt(o.total_offered_internships),
    total_accepted_students: readNonNegativeInt(o.total_accepted_students),
    completed_internships: readNonNegativeInt(o.completed_internships),
  };
}

export async function fetchCompanyEvaluation(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ summary: CompanyEvaluationSummary | null; error: string | null }> {
  const trimmed = companyId.trim();
  if (!trimmed) {
    return { summary: null, error: "Missing company id" };
  }

  const { data, error } = await supabase.rpc("get_company_evaluation", { p_company_id: trimmed });

  if (error) {
    return { summary: null, error: error.message };
  }
  return { summary: parseCompanyEvaluationRpc(data), error: null };
}

export function isCompanyPubliclyEvaluated(summary: CompanyEvaluationSummary | null): boolean {
  return summary != null && summary.evaluation_enabled && !summary.is_new_company;
}

export function formatOverallScore(summary: CompanyEvaluationSummary): string | null {
  if (summary.avg_rating != null) {
    return `${Math.round(Math.min(5, Math.max(1, summary.avg_rating)) * 10) / 10}`;
  }
  if (summary.company_score != null) {
    return `${Math.round(Math.min(1, Math.max(0, summary.company_score)) * 1000) / 10}%`;
  }
  return null;
}

export type CompanyLevel = "white" | "gray" | "black";

export function deriveCompanyLevel(company: {
  is_new_company?: boolean | null;
  evaluation_enabled?: boolean | null;
  company_score?: number | null;
  company_level?: CompanyLevel | null;
} | null | undefined): CompanyLevel | null {
  if (!company || company.is_new_company !== false || !company.evaluation_enabled) {
    return null;
  }
  if (company.company_level === "white" || company.company_level === "gray" || company.company_level === "black") {
    return company.company_level;
  }
  const score = Number(company.company_score ?? 0);
  if (!Number.isFinite(score)) return null;
  if (score >= 0.6) return "white";
  if (score >= 0.4) return "gray";
  return "black";
}

/**
 * Ranking score from semantic similarity + optional company level (W/G/B).
 * New or unevaluated companies keep pure cosine similarity — no boost or penalty.
 */
export function blendRecommendationScore(
  similarityScore: number,
  company: {
    is_new_company?: boolean | null;
    evaluation_enabled?: boolean | null;
    company_score?: number | null;
    company_level?: CompanyLevel | null;
  } | null | undefined
): {
  rankScore: number;
  confidence: "high" | "medium" | "low";
  company_level: CompanyLevel | null;
} {
  const sim = Math.max(0, Math.min(1, similarityScore));
  const level = deriveCompanyLevel(company);

  if (level == null) {
    return { rankScore: sim, confidence: "low", company_level: null };
  }

  let multiplier = 1;
  let confidence: "high" | "medium" | "low" = "medium";

  switch (level) {
    case "white":
      multiplier = 1.1;
      confidence = "high";
      break;
    case "gray":
      multiplier = 1;
      confidence = "medium";
      break;
    case "black":
      multiplier = 0.9;
      confidence = "low";
      break;
  }

  return {
    rankScore: Math.min(1, sim * multiplier),
    confidence,
    company_level: level,
  };
}
