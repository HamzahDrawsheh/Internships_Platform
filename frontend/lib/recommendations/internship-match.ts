import { buildMatchInsights, type MatchInsights } from "@/lib/ai/match-insights";
import { blendRecommendationScore, deriveCompanyLevel, type CompanyLevel } from "@/lib/companies/evaluation";
import {
  analyzeSkillGap,
  type SkillGapAnalysis,
  type SkillGapStudentInput,
} from "@/lib/skill-match";
import { buildMatchScoreBreakdown, type MatchScoreBreakdown } from "@/lib/recommendations/match-score-breakdown";
import {
  evaluateLocationPreference,
  formatWorkArrangementLabel,
  type StudentLocationPrefs,
  type WorkArrangement,
} from "@/lib/recommendations/location-prefs";
import { cosineSimilarity, parsePgVector } from "@/lib/ai/vector-utils";

export type InternshipMatchResult = {
  internship_id: string;
  title: string;
  company_name: string;
  company_id: string;
  listing_location: string | null;
  listing_work_type: WorkArrangement | null;
  similarity_score: number;
  match_percentage: number;
  recommendation_score: number;
  company_confidence: "high" | "medium" | "low";
  company_level: CompanyLevel | null;
  location_city_match: boolean;
  work_type_match: boolean;
  match_insights: MatchInsights;
  skill_gap: SkillGapAnalysis;
  score_breakdown: MatchScoreBreakdown;
};

type PositionRow = {
  id: string;
  title: string | null;
  embedding: unknown;
  company_id: string;
  requirements: string | null;
  description: string | null;
  location: string | null;
  additional_notes: string | null;
  is_active?: boolean | null;
};

type CompanyRow = {
  id: string;
  company_name: string;
  location?: string | null;
  is_new_company: boolean | null;
  evaluation_enabled: boolean | null;
  company_score: number | null;
  company_level?: CompanyLevel | null;
};

export function scoreInternshipMatch(args: {
  position: PositionRow;
  company: CompanyRow | null | undefined;
  companyName: string;
  studentVec: number[];
  studentSources: SkillGapStudentInput;
  locationPrefs?: StudentLocationPrefs;
  t?: (key: string) => string;
}): InternshipMatchResult | null {
  const locationPrefs = args.locationPrefs ?? { workType: "", city: "" };

  const locationEval = evaluateLocationPreference(locationPrefs, {
    location: args.position.location,
    additional_notes: args.position.additional_notes,
    description: args.position.description,
    requirements: args.position.requirements,
    company_location: args.company?.location ?? null,
  });

  if (!locationEval.passesFilter) {
    return null;
  }

  const emb = parsePgVector(args.position.embedding ?? null);
  if (!emb) return null;

  const sim = cosineSimilarity(args.studentVec, emb);
  const similarityScore = Math.max(0, Math.min(1, sim));
  const matchPercentage = Math.round(similarityScore * 10000) / 100;

  const companyLevel = deriveCompanyLevel(args.company);
  const companyForBlend = args.company ? { ...args.company, company_level: companyLevel } : args.company;
  const blended = blendRecommendationScore(similarityScore, companyForBlend);

  let recommendationScore = blended.rankScore * locationEval.rankMultiplier;
  recommendationScore = Math.min(1, Math.max(0, recommendationScore));

  const internshipSource = {
    requirements: args.position.requirements,
    description: args.position.description,
  };

  const skillGap = analyzeSkillGap(args.studentSources, internshipSource, args.t);
  const matchInsights = buildMatchInsights({
    studentSources: args.studentSources,
    internshipTitle: String(args.position.title ?? ""),
    internshipRequirements: args.position.requirements,
    internshipDescription: args.position.description,
    matchPercentage,
  });

  const recPct = Math.round(recommendationScore * 10000) / 100;
  const listingLocationLabel = formatWorkArrangementLabel(args.position.location);

  const scoreBreakdown = buildMatchScoreBreakdown({
    matchPercentage,
    recommendationScore: recPct,
    companyConfidence: blended.confidence,
    companyLevel: blended.company_level,
    locationCityMatch: locationEval.cityMatch,
    workTypeMatch: locationEval.workTypeMatch,
    listingWorkTypeLabel: listingLocationLabel,
    skillGap,
    matchInsights,
  });

  return {
    internship_id: args.position.id,
    title: String(args.position.title ?? ""),
    company_name: args.companyName,
    company_id: args.position.company_id,
    listing_location: listingLocationLabel,
    listing_work_type: locationEval.listingWorkType,
    similarity_score: similarityScore,
    match_percentage: matchPercentage,
    recommendation_score: recPct,
    company_confidence: blended.confidence,
    company_level: blended.company_level,
    location_city_match: locationEval.cityMatch,
    work_type_match: locationEval.workTypeMatch,
    match_insights: matchInsights,
    skill_gap: skillGap,
    score_breakdown: scoreBreakdown,
  };
}
