"use client";

import Link from "next/link";
import type { ApplicationStatus } from "@/lib/types";
import { CompanyLogo } from "@/components/companies/CompanyLogo";
import { InternshipScheduleSummary } from "@/components/internships/InternshipScheduleSummary";
import { WorkArrangementBadge } from "@/components/internships/WorkArrangementBadge";
import { applicationStatusTextClass } from "@/lib/ui/status-text";
import { useI18n } from "@/lib/i18n/context";
import type { InternshipListingStatus } from "@/lib/internships/application-deadline";
import { BrowseLearningPlanSnippet } from "@/components/internships/BrowseLearningPlanSnippet";
import type { LearningPlanEntry } from "@/lib/skill-match";
import type { ImprovementFallbackKey } from "@/lib/recommendations/match-score-breakdown";

const SKILL_CHIP_CLASS =
  "rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium leading-snug text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300";

interface InternshipCardProps {
  id: string;
  title: string;
  companyName?: string;
  companyLogoUrl?: string;
  locationType?: string;
  skills?: string[];
  startDate?: string | null;
  endDate?: string | null;
  applicationDeadline?: string | null;
  isExpired?: boolean;
  /** When set, shows Active / Expired / Paused on the card (e.g. supervisor company view). */
  listingStatus?: InternshipListingStatus;
  /** Student browse: show open vs expired when listingStatus is omitted. */
  openForApplications?: boolean;
  applicationStatus?: ApplicationStatus | null;
  /** Student browse: missing-skill learning plan preview. */
  skillGapPreview?: {
    missingSkillsCount: number;
    learningPlan: LearningPlanEntry[];
    improvementFallback?: ImprovementFallbackKey | null;
  };
}

export function InternshipCard({
  id,
  title,
  companyName,
  companyLogoUrl,
  locationType,
  skills = [],
  startDate,
  endDate,
  applicationDeadline,
  isExpired = false,
  listingStatus,
  openForApplications,
  applicationStatus,
  skillGapPreview,
}: InternshipCardProps) {
  const { t } = useI18n();

  const showExpiredBadge = listingStatus
    ? listingStatus === "expired"
    : isExpired || openForApplications === false;
  const showActiveBadge =
    !showExpiredBadge &&
    (listingStatus === "active" || (listingStatus == null && openForApplications === true));
  const listingStatusBadge =
    showActiveBadge ? (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
        {t("browse.listingActive")}
      </span>
    ) : listingStatus === "inactive" && !showActiveBadge ? (
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {t("browse.listingPaused")}
      </span>
    ) : null;

  const applicationStatusLabel = (status: ApplicationStatus): string => {
    switch (status) {
      case "pending":
        return t("browse.appAppliedPending");
      case "accepted":
        return t("browse.appAppliedAccepted");
      case "rejected":
        return t("browse.appAppliedRejected");
      case "completed":
        return t("browse.appAppliedCompleted");
      case "accepted_pending_commit":
        return t("browse.appConfirmRequired");
      case "commitment_expired":
        return t("browse.appOfferExpired");
      case "withdrawn":
        return t("browse.appWithdrawn");
      default:
        return t("browse.appApplied");
    }
  };

  return (
    <Link href={`/internships/${id}`} className="group block h-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/60 hover:shadow-lg hover:shadow-violet-500/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-500/40">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start gap-3">
            {companyName ? (
              <CompanyLogo
                name={companyName}
                logoUrl={companyLogoUrl}
                size="md"
                className="shrink-0 ring-2 ring-violet-100 dark:ring-violet-500/20"
              />
            ) : null}

            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-300">
                {title}
              </h3>
              {companyName ? (
                <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">{companyName}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              {showExpiredBadge ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
                  {t("browse.expired")}
                </span>
              ) : listingStatusBadge}
              {applicationStatus ? (
                <span
                  className={`max-w-[11rem] truncate text-center text-[10px] leading-tight ${applicationStatusTextClass(applicationStatus)}`}
                  title={applicationStatusLabel(applicationStatus)}
                >
                  {applicationStatusLabel(applicationStatus)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <WorkArrangementBadge location={locationType} />
            {skills.slice(0, 3).map((s) => (
              <span key={s} className={SKILL_CHIP_CLASS}>
                {s}
              </span>
            ))}
            {skills.length > 3 ? (
              <span className={`${SKILL_CHIP_CLASS} text-slate-500 dark:text-slate-400`}>
                +{skills.length - 3}
              </span>
            ) : null}
          </div>

          {skillGapPreview ? (
            <BrowseLearningPlanSnippet
              internshipId={id}
              missingSkillsCount={skillGapPreview.missingSkillsCount}
              learningPlan={skillGapPreview.learningPlan}
              improvementFallback={skillGapPreview.improvementFallback}
              compact
              hideDetailLink
            />
          ) : null}

          <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <InternshipScheduleSummary
              startDate={startDate}
              endDate={endDate}
              applicationDeadline={applicationDeadline}
            />
            {showExpiredBadge ? (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{t("browse.deadlinePassed")}</p>
            ) : null}
            <span className="inline-flex items-center gap-1 self-end text-sm font-medium text-violet-700 transition-transform group-hover:translate-x-0.5 dark:text-violet-300">
              {t("browse.viewRole")}
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
