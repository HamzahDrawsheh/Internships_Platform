export type SuggestionSlide = {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
  href?: string;
  cta?: string;
  action?: "link" | "assistant";
  priority: number;
};

const MAX_WIDGET_SLIDES = 3;

function normTokens(values: string[]): string[] {
  return values
    .flatMap((v) => v.split(/[,;\n|/]+/))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function hasToken(tokens: string[], ...needles: string[]): boolean {
  return needles.some((n) => tokens.some((t) => t.includes(n)));
}

function topSkillTokens(tokens: string[], limit = 3): string[] {
  return [...new Set(tokens)].slice(0, limit);
}

type CareerMatch = {
  id: string;
  score: number;
  title: string;
  reasons: string[];
};

function scoreCareerCandidates(
  tokens: string[],
  input: {
    preferredField: string | null;
    major: string | null;
    preferredWorkType: string | null;
    preferredLocation: string | null;
    labels: Record<string, string>;
  },
): CareerMatch[] {
  const pref = input.preferredField?.trim() || input.major?.trim() || "";
  const candidates: CareerMatch[] = [];

  const push = (id: string, score: number, title: string, reasons: string[]) => {
    candidates.push({ id, score, title, reasons });
  };

  if (hasToken(tokens, "machine learning", "ml", "deep learning", "tensorflow", "pytorch", "nlp")) {
    push("ml", 90, input.labels.careerMlTitle, [
      input.labels.careerMlReason1,
      hasToken(tokens, "python") ? input.labels.careerMlReasonPython : input.labels.careerMlReasonCoursework,
      pref ? input.labels.careerReasonPref.replace("{{field}}", pref) : input.labels.careerMlReasonDemand,
    ]);
  }

  if (hasToken(tokens, "react", "next.js", "javascript", "typescript", "frontend", "html", "css", "vue", "angular")) {
    push("frontend", 88, input.labels.careerFrontendTitle, [
      input.labels.careerFrontendReason1,
      hasToken(tokens, "ui", "ux", "figma") ? input.labels.careerFrontendReasonUi : input.labels.careerFrontendReasonStack,
      pref ? input.labels.careerReasonPref.replace("{{field}}", pref) : input.labels.careerFrontendReasonDemand,
    ]);
  }

  if (
    hasToken(tokens, "data visualization", "tableau", "power bi", "excel", "analytics") ||
    (hasToken(tokens, "python", "sql") && hasToken(tokens, "data"))
  ) {
    push("analyst", 86, input.labels.careerAnalystTitle, [
      hasToken(tokens, "visualization", "tableau", "power bi")
        ? input.labels.careerAnalystReasonViz
        : input.labels.careerAnalystReasonData,
      hasToken(tokens, "python") ? input.labels.careerAnalystReasonPython : input.labels.careerAnalystReasonStructured,
      pref ? input.labels.careerReasonPref.replace("{{field}}", pref) : input.labels.careerAnalystReasonRoles,
    ]);
  }

  if (hasToken(tokens, "java", "spring", "backend", "node", "api", "postgresql", "supabase", "django", "flask")) {
    push("backend", 84, input.labels.careerBackendTitle, [
      input.labels.careerBackendReason1,
      hasToken(tokens, "sql", "database") ? input.labels.careerBackendReasonDb : input.labels.careerBackendReasonFundamentals,
      pref ? input.labels.careerReasonPref.replace("{{field}}", pref) : input.labels.careerBackendReasonOptions,
    ]);
  }

  if (hasToken(tokens, "mobile", "android", "ios", "swift", "kotlin", "flutter", "react native")) {
    push("mobile", 82, input.labels.careerMobileTitle, [
      input.labels.careerMobileReason1,
      input.labels.careerMobileReason2,
      pref ? input.labels.careerReasonPref.replace("{{field}}", pref) : input.labels.careerMobileReasonDemand,
    ]);
  }

  if (hasToken(tokens, "devops", "docker", "kubernetes", "aws", "azure", "ci/cd", "terraform")) {
    push("devops", 80, input.labels.careerDevopsTitle, [
      input.labels.careerDevopsReason1,
      input.labels.careerDevopsReason2,
      pref ? input.labels.careerReasonPref.replace("{{field}}", pref) : input.labels.careerDevopsReasonCloud,
    ]);
  }

  if (hasToken(tokens, "security", "cyber", "penetration", "network")) {
    push("security", 78, input.labels.careerSecurityTitle, [
      input.labels.careerSecurityReason1,
      input.labels.careerSecurityReason2,
      pref ? input.labels.careerReasonPref.replace("{{field}}", pref) : input.labels.careerSecurityReasonDemand,
    ]);
  }

  if (pref) {
    push("preferred", 75, pref, [
      input.labels.careerPreferredReason1.replace("{{field}}", pref),
      tokens.length > 0
        ? input.labels.careerPreferredReasonSkills.replace("{{skills}}", topSkillTokens(tokens).join(", "))
        : input.labels.careerPreferredReasonAddSkills,
      input.preferredWorkType?.trim()
        ? input.labels.careerPreferredReasonWork.replace("{{work}}", input.preferredWorkType.trim())
        : input.labels.careerPreferredReasonBrowse,
    ]);
  }

  push("general", 60, pref || input.major?.trim() || input.labels.careerGeneralTitle, [
    pref ? input.labels.careerReasonPref.replace("{{field}}", pref) : input.labels.careerGeneralReasonProfile,
    tokens.length > 0
      ? input.labels.careerGeneralReasonCount.replace("{{count}}", String(tokens.length))
      : input.labels.careerGeneralReasonAddSkills,
    input.labels.careerGeneralReasonBrowse,
  ]);

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function profileFingerprint(input: {
  technicalSkills: string[];
  softSkills: string[];
  takenCourses: string[];
  customCourses: string[];
  preferredField: string | null;
  major: string | null;
  preferredWorkType: string | null;
  preferredLocation: string | null;
  gpa: number | null;
  applicationCount: number;
}): string {
  return [
    ...input.technicalSkills,
    ...input.softSkills,
    ...input.takenCourses,
    ...input.customCourses,
    input.preferredField ?? "",
    input.major ?? "",
    input.preferredWorkType ?? "",
    input.preferredLocation ?? "",
    input.gpa ?? "",
    input.applicationCount,
  ].join("|");
}

/** Keep the three most relevant slides; tie-break rotates with profile fingerprint. */
export function pickTopSuggestionSlides(
  slides: SuggestionSlide[],
  fingerprint = "",
): SuggestionSlide[] {
  if (slides.length <= MAX_WIDGET_SLIDES) return slides;

  let hash = 0;
  const seed = fingerprint || String(Math.floor(Date.now() / 86_400_000));
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }

  const shuffleKey = (id: string) => {
    let h = hash;
    for (let i = 0; i < id.length; i += 1) {
      h = (h * 31 + id.charCodeAt(i)) | 0;
    }
    return h;
  };

  return [...slides]
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return shuffleKey(a.id) - shuffleKey(b.id);
    })
    .slice(0, MAX_WIDGET_SLIDES);
}

export function buildStudentSuggestionSlides(input: {
  hasDepartment: boolean;
  hasCv: boolean;
  hasApplied: boolean;
  applicationCount: number;
  pendingApplications: number;
  technicalSkills: string[];
  softSkills: string[];
  takenCourses: string[];
  customCourses: string[];
  preferredField: string | null;
  preferredWorkType: string | null;
  preferredLocation: string | null;
  major: string | null;
  gpa: number | null;
  labels: {
    stepProfileTitle: string;
    stepProfileDesc: string;
    stepProfileCta: string;
    stepCvTitle: string;
    stepCvDesc: string;
    stepCvCta: string;
    stepBrowseTitle: string;
    stepBrowseDesc: string;
    stepBrowseCta: string;
    careerTitle: string;
    careerBecause: string;
    hintRefreshTitle: string;
    hintRefreshBody: string;
    hintRefreshCta: string;
    assistantTitle: string;
    assistantBody: string;
    assistantCta: string;
    skillsSpotlightTitle: string;
    skillsSpotlightBody: string;
    skillsSpotlightCta: string;
    pendingAppsTitle: string;
    pendingAppsBody: string;
    pendingAppsCta: string;
    careerMlTitle: string;
    careerMlReason1: string;
    careerMlReasonPython: string;
    careerMlReasonCoursework: string;
    careerMlReasonDemand: string;
    careerFrontendTitle: string;
    careerFrontendReason1: string;
    careerFrontendReasonUi: string;
    careerFrontendReasonStack: string;
    careerFrontendReasonDemand: string;
    careerAnalystTitle: string;
    careerAnalystReasonViz: string;
    careerAnalystReasonData: string;
    careerAnalystReasonPython: string;
    careerAnalystReasonStructured: string;
    careerAnalystReasonRoles: string;
    careerBackendTitle: string;
    careerBackendReason1: string;
    careerBackendReasonDb: string;
    careerBackendReasonFundamentals: string;
    careerBackendReasonOptions: string;
    careerMobileTitle: string;
    careerMobileReason1: string;
    careerMobileReason2: string;
    careerMobileReasonDemand: string;
    careerDevopsTitle: string;
    careerDevopsReason1: string;
    careerDevopsReason2: string;
    careerDevopsReasonCloud: string;
    careerSecurityTitle: string;
    careerSecurityReason1: string;
    careerSecurityReason2: string;
    careerSecurityReasonDemand: string;
    careerPreferredReason1: string;
    careerPreferredReasonSkills: string;
    careerPreferredReasonAddSkills: string;
    careerPreferredReasonWork: string;
    careerPreferredReasonBrowse: string;
    careerGeneralTitle: string;
    careerGeneralReasonProfile: string;
    careerGeneralReasonCount: string;
    careerGeneralReasonAddSkills: string;
    careerGeneralReasonBrowse: string;
    careerReasonPref: string;
  };
}): SuggestionSlide[] {
  const slides: SuggestionSlide[] = [];
  const tokens = normTokens([
    ...input.technicalSkills,
    ...input.softSkills,
    ...input.takenCourses,
    ...input.customCourses,
    input.preferredField ?? "",
    input.major ?? "",
  ]);

  const fingerprint = profileFingerprint(input);

  if (!input.hasDepartment) {
    slides.push({
      id: "profile",
      title: input.labels.stepProfileTitle,
      body: input.labels.stepProfileDesc,
      href: "/profile/student",
      cta: input.labels.stepProfileCta,
      action: "link",
      priority: 100,
    });
  }

  if (!input.hasCv) {
    slides.push({
      id: "cv",
      title: input.labels.stepCvTitle,
      body: input.labels.stepCvDesc,
      href: "/resume-builder",
      cta: input.labels.stepCvCta,
      action: "link",
      priority: 95,
    });
  }

  if (!input.hasApplied) {
    slides.push({
      id: "browse",
      title: input.labels.stepBrowseTitle,
      body: input.labels.stepBrowseDesc,
      href: "/internships",
      cta: input.labels.stepBrowseCta,
      action: "link",
      priority: 90,
    });
  }

  if (input.pendingApplications > 0) {
    slides.push({
      id: "pending-apps",
      title: input.labels.pendingAppsTitle,
      body: input.labels.pendingAppsBody.replace("{{count}}", String(input.pendingApplications)),
      href: "/applications",
      cta: input.labels.pendingAppsCta,
      action: "link",
      priority: 88,
    });
  }

  const careers = scoreCareerCandidates(tokens, {
    preferredField: input.preferredField,
    major: input.major,
    preferredWorkType: input.preferredWorkType,
    preferredLocation: input.preferredLocation,
    labels: input.labels,
  });

  const primaryCareer = careers[0];
  if (primaryCareer) {
    slides.push({
      id: `career-${primaryCareer.id}`,
      title: input.labels.careerTitle,
      body: primaryCareer.title,
      bullets: primaryCareer.reasons,
      href: "/internships",
      cta: input.labels.stepBrowseCta,
      action: "link",
      priority: 78,
    });
  }

  const spotlightSkills = topSkillTokens(input.technicalSkills.length ? input.technicalSkills : tokens, 4);
  if (spotlightSkills.length >= 2) {
    slides.push({
      id: "skills-spotlight",
      title: input.labels.skillsSpotlightTitle,
      body: input.labels.skillsSpotlightBody.replace("{{skills}}", spotlightSkills.join(", ")),
      bullets: spotlightSkills,
      href: "/internships",
      cta: input.labels.skillsSpotlightCta,
      action: "link",
      priority: 74,
    });
  }

  const altCareer = careers.find((c) => c.id !== primaryCareer?.id);
  if (altCareer && altCareer.score >= 75) {
    slides.push({
      id: `career-alt-${altCareer.id}`,
      title: input.labels.careerTitle,
      body: altCareer.title,
      bullets: altCareer.reasons.slice(0, 2),
      href: "/internships",
      cta: input.labels.stepBrowseCta,
      action: "link",
      priority: 68,
    });
  }

  slides.push({
    id: "assistant",
    title: input.labels.assistantTitle,
    body: input.labels.assistantBody,
    cta: input.labels.assistantCta,
    action: "assistant",
    priority: input.hasDepartment && input.hasCv ? 80 : 72,
  });

  slides.push({
    id: "refresh",
    title: input.labels.hintRefreshTitle,
    body: input.labels.hintRefreshBody,
    href: "/internships",
    cta: input.labels.hintRefreshCta,
    action: "link",
    priority: 40,
  });

  return pickTopSuggestionSlides(slides, fingerprint);
}
