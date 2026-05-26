"use client";

import {
  JORDAN_CITY_OPTIONS,
  loadStoredLocationPrefs,
  resolveEffectiveLocationPrefs,
  type StudentLocationPrefs,
  type WorkArrangement,
} from "@/lib/recommendations/location-prefs";
import { createClient } from "@/lib/supabase/client";

export type DashboardRecommendation = {
  internship_id: string;
  title: string;
  company_name: string;
  match_percentage: number;
  recommendation_score?: number;
  listing_work_type?: WorkArrangement | null;
  listing_location?: string | null;
  location_city_match?: boolean;
  work_type_match?: boolean;
  match_insights?: {
    matched_skills?: string[];
    gaps?: string[];
    summary_lines?: string[];
    tips?: string[];
  };
  skill_gap?: {
    matchedSkills?: string[];
    missingSkills?: string[];
    missingSkillsCount?: number;
  };
};

export async function resolveDashboardLocationPrefs(): Promise<{
  prefs: StudentLocationPrefs;
  hasActivePrefs: boolean;
}> {
  const stored = loadStoredLocationPrefs();
  let workType = stored.workType;
  let city = stored.city;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: additional } = await supabase
        .from("student_additional_info")
        .select("preferred_work_type, preferred_location")
        .eq("user_id", user.id)
        .maybeSingle();

      const profileWork = additional?.preferred_work_type?.trim().toLowerCase() ?? "";
      if (!workType && (profileWork === "remote" || profileWork === "onsite" || profileWork === "hybrid")) {
        workType = profileWork;
      }

      const profileCityRaw = additional?.preferred_location?.trim() ?? "";
      if (!city && profileCityRaw) {
        const normalized = profileCityRaw.toLowerCase();
        const match = JORDAN_CITY_OPTIONS.find(
          (c) => c.value && (c.value === normalized || c.label.toLowerCase() === normalized),
        );
        city = match?.value ?? normalized;
      }
    }
  } catch {
    /* use stored prefs only */
  }

  const prefs = resolveEffectiveLocationPrefs(workType, city, "");
  const hasActivePrefs = Boolean(prefs.workType || prefs.city.trim());
  return { prefs, hasActivePrefs };
}

export async function fetchStudentRecommendations(limit = 12): Promise<{
  items: DashboardRecommendation[];
  hasActivePrefs: boolean;
}> {
  const { prefs, hasActivePrefs } = await resolveDashboardLocationPrefs();
  const params = new URLSearchParams({ limit: String(limit) });
  if (prefs.workType) params.set("workType", prefs.workType);
  if (prefs.city.trim()) params.set("city", prefs.city.trim());

  const res = await fetch(`/api/recommendations/internships?${params.toString()}`, {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    return { items: [], hasActivePrefs };
  }

  const body = (await res.json()) as { ok?: boolean; recommendations?: DashboardRecommendation[] };
  if (!body.ok || !Array.isArray(body.recommendations)) {
    return { items: [], hasActivePrefs };
  }

  return { items: body.recommendations, hasActivePrefs };
}
