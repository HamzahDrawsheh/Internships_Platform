import type { CompanyDimensionAvgs } from "@/lib/dashboard/load-company-dashboard-snapshot";
import type { CompanyDashboardSnapshot } from "@/lib/dashboard/load-company-dashboard-snapshot";
import { isCompanyPubliclyEvaluated } from "@/lib/companies/evaluation";
import { fmt } from "@/lib/i18n/format";

export type CompanyHintBadge = "urgent" | "recommended" | "onTrack";

export type CompanyHintSlide = {
  id: string;
  priority: number;
  badge: CompanyHintBadge;
  title: string;
  body: string;
  href: string;
  cta: string;
};

type TFn = (key: string) => string;

const H = "dashboard.company.widgets.hints";
const D = "dashboard.company.widgets.dimensions";

export function dimensionLabel(key: keyof CompanyDimensionAvgs, t: TFn): string {
  return t(`${D}.${key}`);
}

function pluralFmt(
  t: TFn,
  count: number,
  oneKey: string,
  manyKey: string,
  vars: Record<string, string | number>,
): string {
  return fmt(t(count === 1 ? oneKey : manyKey), vars);
}

export function buildCompanyReputationHintSlides(
  snapshot: CompanyDashboardSnapshot,
  t: TFn,
): CompanyHintSlide[] {
  const slides: CompanyHintSlide[] = [];
  const evalSummary = snapshot.evaluation;

  if (snapshot.pendingEvalCount > 0) {
    slides.push({
      id: "pending-evals",
      priority: 100,
      badge: "urgent",
      title: t(`${H}.pendingEvalsTitle`),
      body: pluralFmt(t, snapshot.pendingEvalCount, `${H}.pendingEvalsBody`, `${H}.pendingEvalsBodyPlural`, {
        count: snapshot.pendingEvalCount,
      }),
      href: "/company/internship-reports",
      cta: t(`${H}.pendingEvalsCta`),
    });
  }

  if (snapshot.pendingApplicationCount >= 5) {
    slides.push({
      id: "pending-apps",
      priority: 92,
      badge: "recommended",
      title: t(`${H}.pendingAppsTitle`),
      body: fmt(t(`${H}.pendingAppsBody`), { count: snapshot.pendingApplicationCount }),
      href: "/company/applications",
      cta: t(`${H}.pendingAppsCta`),
    });
  }

  if (
    evalSummary?.company_level === "black" ||
    (evalSummary?.avg_rating != null && evalSummary.avg_rating < 3.5)
  ) {
    const weakKey = snapshot.weakestDimension;
    const weakLabel = weakKey ? dimensionLabel(weakKey, t) : t(`${H}.traineeExperience`);
    const weakScore =
      weakKey && snapshot.dimensionAvgs ? snapshot.dimensionAvgs[weakKey].toFixed(1) : null;
    slides.push({
      id: "improve-score",
      priority: 90,
      badge: "urgent",
      title: t(`${H}.improveScoreTitle`),
      body: weakScore
        ? fmt(t(`${H}.improveScoreBodyWeak`), { dimension: weakLabel, score: weakScore })
        : t(`${H}.improveScoreBodyGeneric`),
      href: "/company/internship-reports",
      cta: t(`${H}.improveScoreCta`),
    });
  } else if (
    evalSummary?.completion_rate_pct != null &&
    evalSummary.completion_rate_pct < 70
  ) {
    slides.push({
      id: "completion-rate",
      priority: 85,
      badge: "recommended",
      title: t(`${H}.completionRateTitle`),
      body: fmt(t(`${H}.completionRateBody`), { pct: evalSummary.completion_rate_pct }),
      href: "/company/internship-reports",
      cta: t(`${H}.completionRateCta`),
    });
  }

  if (evalSummary && evalSummary.total_feedbacks < 3 && !evalSummary.is_new_company) {
    slides.push({
      id: "more-feedback",
      priority: 75,
      badge: "recommended",
      title: t(`${H}.moreFeedbackTitle`),
      body: t(`${H}.moreFeedbackBody`),
      href: "/company/internships",
      cta: t(`${H}.moreFeedbackCta`),
    });
  }

  if (evalSummary?.is_new_company) {
    slides.push({
      id: "new-company",
      priority: 70,
      badge: "recommended",
      title: t(`${H}.newCompanyTitle`),
      body: t(`${H}.newCompanyBody`),
      href: "/company/internships/new",
      cta: t(`${H}.newCompanyCta`),
    });
  }

  if (
    isCompanyPubliclyEvaluated(evalSummary) &&
    evalSummary?.company_level === "white" &&
    (evalSummary.avg_rating ?? 0) >= 4
  ) {
    slides.push({
      id: "on-track",
      priority: 40,
      badge: "onTrack",
      title: t(`${H}.onTrackTitle`),
      body: t(`${H}.onTrackBody`),
      href: `/companies/${snapshot.companyId}`,
      cta: t(`${H}.onTrackCta`),
    });
  }

  if (slides.length === 0) {
    slides.push({
      id: "default",
      priority: 50,
      badge: "recommended",
      title: t(`${H}.defaultTitle`),
      body: t(`${H}.defaultBody`),
      href: "/profile/company",
      cta: t(`${H}.defaultCta`),
    });
  }

  return slides.sort((a, b) => b.priority - a.priority);
}

export function buildGrowListingsSlides(snapshot: CompanyDashboardSnapshot, t: TFn): CompanyHintSlide[] {
  const slides: CompanyHintSlide[] = [];
  const top = snapshot.listings.length > 0
    ? [...snapshot.listings].sort((a, b) => b.applicantCount - a.applicantCount)[0]
    : null;
  const stale = snapshot.listings.find(
    (l) =>
      l.isActive &&
      l.applicantCount === 0 &&
      Date.now() - new Date(l.createdAt).getTime() >= 14 * 24 * 60 * 60 * 1000,
  );

  if (snapshot.activeListingCount === 0) {
    slides.push({
      id: "no-active",
      priority: 100,
      badge: "urgent",
      title: t(`${H}.noActiveTitle`),
      body: t(`${H}.noActiveBody`),
      href: "/company/internships/new",
      cta: t(`${H}.noActiveCta`),
    });
  } else if (snapshot.activeListingCount === 1) {
    slides.push({
      id: "add-more",
      priority: 90,
      badge: "recommended",
      title: t(`${H}.addMoreTitle`),
      body: t(`${H}.addMoreBody`),
      href: "/company/internships/new",
      cta: t(`${H}.addMoreCta`),
    });
  } else if (stale) {
    slides.push({
      id: "stale-listing",
      priority: 88,
      badge: "recommended",
      title: fmt(t(`${H}.staleListingTitle`), { title: stale.title }),
      body: t(`${H}.staleListingBody`),
      href: "/company/internships",
      cta: t(`${H}.staleListingCta`),
    });
  } else if (snapshot.pendingApplicationCount > 0 && snapshot.activeListingCount < 3) {
    slides.push({
      id: "demand",
      priority: 85,
      badge: "recommended",
      title: t(`${H}.demandTitle`),
      body: pluralFmt(
        t,
        snapshot.pendingApplicationCount,
        `${H}.demandBody`,
        `${H}.demandBodyPlural`,
        { pending: snapshot.pendingApplicationCount, active: snapshot.activeListingCount },
      ),
      href: "/company/internships/new",
      cta: t(`${H}.demandCta`),
    });
  } else {
    slides.push({
      id: "healthy",
      priority: 60,
      badge: "onTrack",
      title: t(`${H}.healthyTitle`),
      body: t(`${H}.healthyBody`),
      href: "/company/internships",
      cta: t(`${H}.healthyCta`),
    });
  }

  slides.push({
    id: "activity",
    priority: 70,
    badge: "recommended",
    title: t(`${H}.activityTitle`),
    body:
      snapshot.applicationsThisWeek > 0
        ? pluralFmt(t, snapshot.applicationsThisWeek, `${H}.activityBodyWeek`, `${H}.activityBodyWeekPlural`, {
            count: snapshot.applicationsThisWeek,
          })
        : t(`${H}.activityBodyNone`),
    href: "/company/applications",
    cta: t(`${H}.activityCta`),
  });

  if (top && top.applicantCount > 0) {
    slides.push({
      id: "top-performer",
      priority: 65,
      badge: "onTrack",
      title: t(`${H}.topPerformerTitle`),
      body: pluralFmt(t, top.applicantCount, `${H}.topPerformerBody`, `${H}.topPerformerBodyPlural`, {
        title: top.title,
        count: top.applicantCount,
      }),
      href: "/company/internships",
      cta: t(`${H}.topPerformerCta`),
    });
  } else {
    slides.push({
      id: "get-started",
      priority: 55,
      badge: "recommended",
      title: t(`${H}.attractTitle`),
      body: t(`${H}.attractBody`),
      href: "/company/internships/new",
      cta: t(`${H}.attractCta`),
    });
  }

  return slides.sort((a, b) => b.priority - a.priority).slice(0, 3);
}
