"use client";

import Link from "next/link";
import type { ApplicationStatus } from "@/lib/types";
import { CompanyLogo } from "@/components/companies/CompanyLogo";
import { WorkArrangementBadge } from "@/components/internships/WorkArrangementBadge";
import { useI18n } from "@/lib/i18n/context";

function applicationStatusBadgeClasses(status: ApplicationStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-500/25 dark:text-amber-200 dark:ring-amber-500/30";
    case "accepted":
      return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80 dark:bg-emerald-500/25 dark:text-emerald-200 dark:ring-emerald-500/30";
    case "rejected":
      return "bg-rose-100 text-rose-900 ring-1 ring-rose-200/80 dark:bg-rose-500/25 dark:text-rose-200 dark:ring-rose-500/30";
    case "completed":
      return "bg-sky-100 text-sky-900 ring-1 ring-sky-200/80 dark:bg-sky-500/25 dark:text-sky-200 dark:ring-sky-500/30";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200";
  }
}

const SKILL_CHIP_CLASSES = [
  "bg-violet-100 text-violet-800 ring-violet-200/70 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-500/30",
  "bg-cyan-100 text-cyan-800 ring-cyan-200/70 dark:bg-cyan-500/20 dark:text-cyan-200 dark:ring-cyan-500/30",
  "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200/70 dark:bg-fuchsia-500/20 dark:text-fuchsia-200 dark:ring-fuchsia-500/30",
  "bg-indigo-100 text-indigo-800 ring-indigo-200/70 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-500/30",
];

interface InternshipCardProps {
  id: string;
  title: string;
  companyName?: string;
  companyLogoUrl?: string;
  locationType?: string;
  skills?: string[];
  deadline?: string;
  applicationStatus?: ApplicationStatus | null;
}

export function InternshipCard({
  id,
  title,
  companyName,
  companyLogoUrl,
  locationType,
  skills = [],
  deadline,
  applicationStatus,
}: InternshipCardProps) {
  const { t } = useI18n();

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
              {applicationStatus ? (
                <span
                  className={`max-w-[11rem] truncate rounded-full px-2.5 py-1 text-center text-[10px] font-semibold leading-tight ring-1 ${applicationStatusBadgeClasses(applicationStatus)}`}
                  title={applicationStatusLabel(applicationStatus)}
                >
                  {applicationStatusLabel(applicationStatus)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <WorkArrangementBadge location={locationType} />
            {skills.slice(0, 3).map((s, i) => (
              <span
                key={s}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${SKILL_CHIP_CLASSES[i % SKILL_CHIP_CLASSES.length]}`}
              >
                {s}
              </span>
            ))}
            {skills.length > 3 ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                +{skills.length - 3}
              </span>
            ) : null}
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            {deadline ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">{t("browse.posted")}</span>{" "}
                {deadline}
              </p>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 transition-transform group-hover:translate-x-0.5 dark:text-violet-300">
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
