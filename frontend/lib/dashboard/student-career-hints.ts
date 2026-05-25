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

function inferCareerDirection(
  tokens: string[],
  preferredField: string | null,
  major: string | null
): { title: string; reasons: string[] } {
  const pref = preferredField?.trim() || major?.trim() || "";

  if (hasToken(tokens, "machine learning", "ml", "deep learning", "tensorflow", "pytorch")) {
    return {
      title: "Machine Learning Engineer",
      reasons: [
        "Machine learning skills on your profile",
        hasToken(tokens, "python") ? "Python activity" : "Technical coursework",
        pref ? `Interest in ${pref}` : "Strong fit for AI-focused internships",
      ],
    };
  }

  if (
    hasToken(tokens, "react", "next.js", "javascript", "typescript", "frontend", "html", "css")
  ) {
    return {
      title: "Frontend Developer",
      reasons: [
        "Web development skills listed",
        hasToken(tokens, "ui", "ux", "figma") ? "UI/UX awareness" : "Modern stack experience",
        pref ? `Aligned with ${pref}` : "High demand in internship listings",
      ],
    };
  }

  if (
    hasToken(tokens, "data visualization", "tableau", "power bi", "excel") ||
    (hasToken(tokens, "python", "sql") && hasToken(tokens, "data"))
  ) {
    return {
      title: "Data Analyst",
      reasons: [
        hasToken(tokens, "visualization", "tableau", "power bi")
          ? "Strong visualization skills"
          : "Data & analytics skills",
        hasToken(tokens, "python") ? "Python activity" : "Structured analysis background",
        pref ? `Internship preferences (${pref})` : "Matches common analyst roles",
      ],
    };
  }

  if (hasToken(tokens, "java", "spring", "backend", "node", "api", "postgresql", "supabase")) {
    return {
      title: "Backend / Software Engineer",
      reasons: [
        "Backend or systems skills detected",
        hasToken(tokens, "sql", "database") ? "Database experience" : "Software fundamentals",
        pref ? `Career interest: ${pref}` : "Broad engineering internship options",
      ],
    };
  }

  return {
    title: pref || major || "Technology & Business",
    reasons: [
      pref ? `Your preferred field: ${pref}` : "Complete your profile for sharper matches",
      tokens.length > 0 ? `${tokens.length}+ skills/courses detected` : "Add skills to unlock direction",
      "Browse internships to explore roles",
    ],
  };
}

/** Keep the three most relevant slides; tie-break with a stable daily shuffle. */
export function pickTopSuggestionSlides(slides: SuggestionSlide[]): SuggestionSlide[] {
  if (slides.length <= MAX_WIDGET_SLIDES) return slides;

  const daySeed = Math.floor(Date.now() / 86_400_000);
  const shuffleKey = (id: string) => {
    let hash = daySeed;
    for (let i = 0; i < id.length; i += 1) {
      hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    return hash;
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
  technicalSkills: string[];
  softSkills: string[];
  takenCourses: string[];
  customCourses: string[];
  preferredField: string | null;
  major: string | null;
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

  const career = inferCareerDirection(tokens, input.preferredField, input.major);
  slides.push({
    id: "career",
    title: input.labels.careerTitle,
    body: career.title,
    bullets: career.reasons,
    href: "/internships",
    cta: input.labels.stepBrowseCta,
    action: "link",
    priority: 70,
  });

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

  return pickTopSuggestionSlides(slides);
}
