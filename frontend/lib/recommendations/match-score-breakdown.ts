import type { MatchInsights } from "@/lib/ai/match-insights";
import type { CompanyLevel } from "@/lib/companies/evaluation";
import { sanitizeImprovementSkills, type SkillGapAnalysis } from "@/lib/skill-match";

export type MatchSuitability = "strong" | "moderate" | "stretch" | "unknown";

export type MatchScoreFactorId =
  | "semantic"
  | "skill_overlap"
  | "company_rank"
  | "company_level"
  | "location_city"
  | "work_type"
  | "semantic_vs_skills";

export type ImprovementFallbackKey =
  | "add_profile"
  | "semantic_only"
  | "stretch"
  | "general";

export type MatchScoreBreakdown = {
  match_percentage: number;
  recommendation_score: number | null;
  company_confidence: "high" | "medium" | "low" | null;
  company_level: CompanyLevel | null;
  location_city_match: boolean;
  work_type_match: boolean;
  listing_work_type_label: string | null;
  semantic_match_pct: number;
  skill_overlap_pct: number | null;
  matched_skill_count: number;
  total_required_skills: number;
  student_skill_count: number;
  matched_skills: string[];
  missing_skills: string[];
  keyword_matched_skills: string[];
  keyword_gaps: string[];
  suitability: MatchSuitability;
  score_factors: MatchScoreFactorId[];
  improvement_priorities: string[];
  improvement_fallback: ImprovementFallbackKey | null;
};

function roundPct(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)) * 100) / 100;
}

function deriveSuitability(
  semanticPct: number,
  skillOverlapPct: number | null,
  hasSkills: boolean,
  missingCount: number
): MatchSuitability {
  if (!hasSkills) return "unknown";
  const overlap = skillOverlapPct ?? 0;
  if (semanticPct >= 70 && missingCount <= 1) return "strong";
  if (semanticPct >= 45 || overlap >= 50) return "moderate";
  if (semanticPct < 40 && overlap < 35) return "stretch";
  return "moderate";
}

function resolveImprovementFallback(
  skillGap: SkillGapAnalysis,
  suitability: MatchSuitability,
  improvementPriorities: string[]
): ImprovementFallbackKey | null {
  if (improvementPriorities.length > 0) return null;
  if (suitability === "strong" && skillGap.missingSkillsCount === 0) return null;
  if (skillGap.studentSkillCount === 0) return "add_profile";
  if (!skillGap.hasDetectableInternshipSkills) return "semantic_only";
  if (suitability === "stretch") return "stretch";
  return "general";
}

export function buildMatchScoreBreakdown(args: {
  matchPercentage: number;
  recommendationScore?: number | null;
  companyConfidence?: "high" | "medium" | "low" | null;
  companyLevel?: CompanyLevel | null;
  locationCityMatch?: boolean;
  workTypeMatch?: boolean;
  listingWorkTypeLabel?: string | null;
  skillGap: SkillGapAnalysis;
  matchInsights?: MatchInsights | null;
}): MatchScoreBreakdown {
  const semanticPct = roundPct(args.matchPercentage);
  const recScore =
    args.recommendationScore != null && Number.isFinite(args.recommendationScore)
      ? roundPct(args.recommendationScore)
      : null;

  const total = args.skillGap.internshipSkillCount;
  const matched = args.skillGap.matchedSkills.length;
  const skillOverlapPct =
    total > 0 ? roundPct((matched / total) * 100) : null;

  const score_factors: MatchScoreFactorId[] = ["semantic"];
  if (args.skillGap.hasDetectableInternshipSkills) {
    score_factors.push("skill_overlap");
  }
  if (recScore != null && recScore !== semanticPct) {
    if (args.companyLevel) {
      score_factors.push("company_level");
    } else {
      score_factors.push("company_rank");
    }
  }
  if (args.locationCityMatch) {
    score_factors.push("location_city");
  }
  if (args.workTypeMatch && args.listingWorkTypeLabel) {
    score_factors.push("work_type");
  }
  if (
    args.skillGap.hasDetectableInternshipSkills &&
    skillOverlapPct != null &&
    Math.abs(skillOverlapPct - semanticPct) >= 15
  ) {
    score_factors.push("semantic_vs_skills");
  }

  const improvement_priorities = sanitizeImprovementSkills(
    ...args.skillGap.missingSkills,
    ...(args.matchInsights?.gaps ?? [])
  );

  const suitability = deriveSuitability(
    semanticPct,
    skillOverlapPct,
    args.skillGap.hasDetectableInternshipSkills,
    args.skillGap.missingSkillsCount
  );

  const improvement_fallback = resolveImprovementFallback(
    args.skillGap,
    suitability,
    improvement_priorities
  );

  return {
    match_percentage: semanticPct,
    recommendation_score: recScore,
    company_confidence: args.companyConfidence ?? null,
    company_level: args.companyLevel ?? null,
    location_city_match: args.locationCityMatch ?? false,
    work_type_match: args.workTypeMatch ?? false,
    listing_work_type_label: args.listingWorkTypeLabel ?? null,
    semantic_match_pct: semanticPct,
    skill_overlap_pct: skillOverlapPct,
    matched_skill_count: matched,
    total_required_skills: total,
    student_skill_count: args.skillGap.studentSkillCount,
    matched_skills: args.skillGap.matchedSkills,
    missing_skills: args.skillGap.missingSkills,
    keyword_matched_skills: args.matchInsights?.matched_skills ?? [],
    keyword_gaps: args.matchInsights?.gaps ?? [],
    suitability,
    score_factors,
    improvement_priorities,
    improvement_fallback,
  };
}
