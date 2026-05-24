import type { SupabaseClient } from "@supabase/supabase-js";

export type CompanyStudentFeedback = {
  id: string;
  source: "training" | "legacy";
  overall_rating: number;
  mentorship_rating: number | null;
  environment_rating: number | null;
  skills_rating: number | null;
  would_recommend: boolean | null;
  other_notes: string | null;
  avg_rating: number | null;
  created_at: string;
};

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

function readRating(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseFeedbackRow(raw: unknown): CompanyStudentFeedback | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  const overall = readRating(o.overall_rating);
  const createdAt = typeof o.created_at === "string" ? o.created_at : null;
  if (!id || overall == null || !createdAt) return null;

  const sourceRaw = typeof o.source === "string" ? o.source : "training";
  const source: CompanyStudentFeedback["source"] = sourceRaw === "legacy" ? "legacy" : "training";

  let wouldRecommend: boolean | null = null;
  if (typeof o.would_recommend === "boolean") {
    wouldRecommend = o.would_recommend;
  }

  const notesRaw = o.other_notes;
  const other_notes =
    typeof notesRaw === "string" && notesRaw.trim().length > 0 ? notesRaw.trim() : null;

  return {
    id,
    source,
    overall_rating: overall,
    mentorship_rating: readRating(o.mentorship_rating),
    environment_rating: readRating(o.environment_rating),
    skills_rating: readRating(o.skills_rating),
    would_recommend: wouldRecommend,
    other_notes,
    avg_rating: readRating(o.avg_rating),
    created_at: createdAt,
  };
}

export function parseCompanyStudentFeedbacksRpc(data: unknown): CompanyStudentFeedback[] {
  const unwrapped = unwrapRpcJsonPayload(data);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped.map(parseFeedbackRow).filter((row): row is CompanyStudentFeedback => row != null);
}

export async function fetchCompanyStudentFeedbacks(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ feedbacks: CompanyStudentFeedback[]; error: string | null }> {
  const trimmed = companyId.trim();
  if (!trimmed) {
    return { feedbacks: [], error: "Missing company id" };
  }

  const { data, error } = await supabase.rpc("get_company_student_feedbacks", {
    p_company_id: trimmed,
  });

  if (error) {
    return { feedbacks: [], error: error.message };
  }

  return { feedbacks: parseCompanyStudentFeedbacksRpc(data), error: null };
}
