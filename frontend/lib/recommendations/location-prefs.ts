export type WorkArrangement = "remote" | "onsite" | "hybrid";

export type StudentLocationPrefs = {
  workType: WorkArrangement | "";
  city: string;
};

export const JORDAN_CITY_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "", label: "Any city" },
  { value: "amman", label: "Amman" },
  { value: "irbid", label: "Irbid" },
  { value: "zarqa", label: "Zarqa" },
  { value: "aqaba", label: "Aqaba" },
  { value: "salt", label: "Salt" },
  { value: "madaba", label: "Madaba" },
  { value: "jerash", label: "Jerash" },
  { value: "ajloun", label: "Ajloun" },
  { value: "karak", label: "Karak" },
  { value: "maan", label: "Ma'an" },
  { value: "mafraq", label: "Mafraq" },
  { value: "tafilah", label: "Tafilah" },
] as const;

const WORK_TYPE_ALIASES: Record<string, WorkArrangement> = {
  remote: "remote",
  remotely: "remote",
  "work from home": "remote",
  wfh: "remote",
  onsite: "onsite",
  "on-site": "onsite",
  "on site": "onsite",
  office: "onsite",
  hybrid: "hybrid",
  "hybrid work": "hybrid",
};

export function normalizeWorkType(raw: string | null | undefined): WorkArrangement | null {
  if (raw == null) return null;
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (WORK_TYPE_ALIASES[t]) return WORK_TYPE_ALIASES[t];
  if (t.includes("remote")) return "remote";
  if (t.includes("hybrid")) return "hybrid";
  if (t.includes("on-site") || t.includes("onsite") || t.includes("on site")) return "onsite";
  return null;
}

/** Student work-type preference vs internship listing location field. */
export function isWorkTypeCompatible(
  studentPref: WorkArrangement | "",
  internshipLocation: string | null | undefined
): boolean {
  if (!studentPref) return true;
  const listing = normalizeWorkType(internshipLocation);
  if (!listing) return true;
  if (studentPref === "remote") return listing === "remote" || listing === "hybrid";
  if (studentPref === "onsite") return listing === "onsite" || listing === "hybrid";
  return true;
}

function normalizeCityToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "");
}

/** Search posting/company text for a preferred city (Amman, Irbid, …). */
export function postingMentionsCity(
  cityPref: string,
  texts: Array<string | null | undefined>
): boolean {
  const city = normalizeCityToken(cityPref);
  if (!city) return false;
  const blob = texts
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .join(" ")
    .toLowerCase();
  if (!blob) return false;
  return blob.includes(city);
}

export function cityPreferenceApplies(workType: WorkArrangement | "", city: string): boolean {
  return Boolean(city.trim());
}

export function resolveEffectiveLocationPrefs(
  recWorkType: WorkArrangement | "",
  recCity: string,
  browseLocationFilter: string
): StudentLocationPrefs {
  const fromBrowse =
    browseLocationFilter === "remote" ||
    browseLocationFilter === "onsite" ||
    browseLocationFilter === "hybrid"
      ? browseLocationFilter
      : "";
  return {
    workType: recWorkType || fromBrowse,
    city: recCity.trim(),
  };
}

export function parseLocationPrefsFromSearchParams(
  params: URLSearchParams
): StudentLocationPrefs {
  const rawWork = params.get("workType")?.trim().toLowerCase() ?? "";
  const workType =
    rawWork === "remote" || rawWork === "onsite" || rawWork === "hybrid" ? rawWork : "";
  const city = params.get("city")?.trim() ?? "";
  return { workType, city };
}

export function buildLocationPrefsQuery(prefs: StudentLocationPrefs): string {
  const q = new URLSearchParams();
  if (prefs.workType) q.set("workType", prefs.workType);
  if (prefs.city.trim()) q.set("city", prefs.city.trim());
  const s = q.toString();
  return s ? `&${s}` : "";
}

const REC_PREFS_STORAGE_KEY = "internship_rec_prefs_v1";

export function loadStoredLocationPrefs(): StudentLocationPrefs {
  if (typeof window === "undefined") return { workType: "", city: "" };
  try {
    const raw = window.localStorage.getItem(REC_PREFS_STORAGE_KEY);
    if (!raw) return { workType: "", city: "" };
    const parsed = JSON.parse(raw) as Partial<StudentLocationPrefs>;
    const workType =
      parsed.workType === "remote" || parsed.workType === "onsite" || parsed.workType === "hybrid"
        ? parsed.workType
        : "";
    return { workType, city: typeof parsed.city === "string" ? parsed.city : "" };
  } catch {
    return { workType: "", city: "" };
  }
}

export function saveStoredLocationPrefs(prefs: StudentLocationPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REC_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota errors */
  }
}

export function formatWorkArrangementLabel(raw: string | null | undefined): string | null {
  const normalized = normalizeWorkType(raw);
  if (!normalized) return null;
  switch (normalized) {
    case "remote":
      return "Remote";
    case "onsite":
      return "On-site";
    case "hybrid":
      return "Hybrid";
    default:
      return null;
  }
}

/** Rank boost when student work-type preference aligns with listing location field. */
function workTypeRankMultiplier(
  studentPref: WorkArrangement | "",
  listing: WorkArrangement | null
): { multiplier: number; workTypeMatch: boolean } {
  if (!studentPref || !listing) {
    return { multiplier: 1, workTypeMatch: false };
  }
  if (studentPref === listing) {
    return { multiplier: 1.1, workTypeMatch: true };
  }
  if (listing === "hybrid" || studentPref === "hybrid") {
    return { multiplier: 1.05, workTypeMatch: true };
  }
  return { multiplier: 1, workTypeMatch: false };
}

export type LocationPreferenceResult = {
  passesFilter: boolean;
  cityMatch: boolean;
  workTypeMatch: boolean;
  listingWorkType: WorkArrangement | null;
  rankMultiplier: number;
};

/** Hard filter + rank boost when city matches (ranking only, not match %). */
export function evaluateLocationPreference(
  prefs: StudentLocationPrefs,
  posting: {
    location: string | null | undefined;
    additional_notes: string | null | undefined;
    description: string | null | undefined;
    requirements: string | null | undefined;
    company_location: string | null | undefined;
  }
): LocationPreferenceResult {
  const listingWorkType = normalizeWorkType(posting.location);

  if (!isWorkTypeCompatible(prefs.workType, posting.location)) {
    return {
      passesFilter: false,
      cityMatch: false,
      workTypeMatch: false,
      listingWorkType,
      rankMultiplier: 1,
    };
  }

  const workTypeBoost = workTypeRankMultiplier(prefs.workType, listingWorkType);
  let rankMultiplier = workTypeBoost.multiplier;

  const cityPref = prefs.city.trim();
  if (!cityPreferenceApplies(prefs.workType, cityPref)) {
    return {
      passesFilter: true,
      cityMatch: false,
      workTypeMatch: workTypeBoost.workTypeMatch,
      listingWorkType,
      rankMultiplier,
    };
  }

  const cityMatch = postingMentionsCity(cityPref, [
    posting.company_location,
    posting.additional_notes,
    posting.description,
    posting.requirements,
  ]);

  if (!cityMatch) {
    return {
      passesFilter: false,
      cityMatch: false,
      workTypeMatch: workTypeBoost.workTypeMatch,
      listingWorkType,
      rankMultiplier: 1,
    };
  }

  rankMultiplier *= 1.12;

  return {
    passesFilter: true,
    cityMatch: true,
    workTypeMatch: workTypeBoost.workTypeMatch,
    listingWorkType,
    rankMultiplier,
  };
}
