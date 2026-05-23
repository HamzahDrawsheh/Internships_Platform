import Link from "next/link";

import { Badge } from "@/components/ui";

import { CompanyLogo } from "@/components/companies/CompanyLogo";
import { MessageCompanyButton } from "@/components/messaging/MessageCompanyButton";
import { formatIndustryLabel } from "@/lib/companies/industry";

interface CompanyCardProps {
  id: string;
  name: string;
  industry?: string;
  location?: string;
  description?: string;
  rating?: number;
  logoUrl?: string;
  isNewCompany?: boolean;
  evaluationEnabled?: boolean;
  openPositions?: number;
  ownerUserId?: string;
}

export function CompanyCard({
  id,
  name,
  industry,
  location,
  description,
  rating,
  logoUrl,
  isNewCompany,
  evaluationEnabled,
  openPositions,
  ownerUserId,
}: CompanyCardProps) {
  const showRating = !isNewCompany && evaluationEnabled && rating != null;
  const trimmedDescription = description?.trim();
  const industryLabel = industry ? formatIndustryLabel(industry) : "";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/60 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-500/40">
      <Link href={`/companies/${id}`} className="block flex-1">
        <div className="relative h-20 bg-gradient-to-r from-violet-600/90 via-purple-600/80 to-indigo-600/90 px-5 dark:from-violet-700/80 dark:via-purple-700/70 dark:to-indigo-700/80">
          <div className="absolute -bottom-8 left-5">
            <CompanyLogo name={name} logoUrl={logoUrl} size="lg" className="ring-4 ring-white dark:ring-slate-900" />
          </div>
        </div>

        <div className="flex flex-col px-5 pb-4 pt-11">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-slate-900 transition-colors duration-300 group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-300">
              {name}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {industryLabel ? (
                <Badge variant="info" className="max-w-full truncate">
                  {industryLabel}
                </Badge>
              ) : null}
              {isNewCompany ? (
                <Badge variant="warning">New company</Badge>
              ) : showRating ? (
                <Badge variant="success">★ {rating?.toFixed(1)}</Badge>
              ) : !evaluationEnabled ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">No ratings yet</span>
              ) : null}
            </div>
          </div>

          {(location || openPositions != null) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
              {location ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.262-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.163-.089c.124-.072.302-.18.525-.316.446-.277.983-.645 1.505-1.08.522-.435 1.04-.92 1.437-1.433.795-.99 1.3-2.05 1.3-3.15 0-2.21-1.79-4-4-4s-4 1.79-4 4c0 1.1.505 2.16 1.3 3.15.397.513.915.998 1.437 1.433.522.435 1.06.803 1.505 1.08.223.136.401.244.525.316a5.741 5.741 0 00.163.089l.018.008.006.003zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="truncate">{location}</span>
                </span>
              ) : null}
              {openPositions != null ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 100 2h2a1 1 0 100-2H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {openPositions === 0 ? "No open roles" : `${openPositions} open ${openPositions === 1 ? "role" : "roles"}`}
                </span>
              ) : null}
            </div>
          )}

          {trimmedDescription ? (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{trimmedDescription}</p>
          ) : (
            <p className="mt-3 text-sm italic text-slate-400 dark:text-slate-500">No description provided yet.</p>
          )}
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <Link
          href={`/companies/${id}`}
          className="text-sm font-medium text-violet-700 transition-colors duration-300 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
        >
          View company →
        </Link>
        <MessageCompanyButton companyOwnerUserId={ownerUserId ?? ""} companyName={name} compact className="rounded-full px-3 py-1.5 text-sm" />
      </div>
    </article>
  );
}
