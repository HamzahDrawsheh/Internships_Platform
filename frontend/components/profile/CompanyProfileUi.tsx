import type { ReactNode } from "react";
import { CompanyLogo } from "@/components/companies/CompanyLogo";

export function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const clamped = Math.max(0, Math.min(max, value));
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${clamped} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < Math.round(clamped) ? "fill-current" : "fill-none stroke-current opacity-30"}`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export function CompanyProfileHero({
  name,
  logoUrl,
  previewUrl,
  subtitle,
  badge,
  completeness,
  stats,
  action,
}: {
  name: string;
  logoUrl?: string | null;
  previewUrl?: string | null;
  subtitle?: string;
  badge?: string;
  completeness: number;
  stats: { label: string; value: string }[];
  action?: ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, completeness));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200/50 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 shadow-lg shadow-violet-200/40 dark:border-violet-500/20 dark:shadow-violet-900/30">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <CompanyLogo
              name={name.trim() || "Company"}
              logoUrl={logoUrl}
              previewUrl={previewUrl}
              size="hero"
              className="ring-4 ring-white/30 shadow-lg"
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{name.trim() || "Company"}</h1>
              {subtitle ? <p className="mt-1 text-sm text-violet-100/90">{subtitle}</p> : null}
              {badge ? (
                <span className="mt-3 inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {badge}
                </span>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-violet-100/90">
            <span>Profile completeness</span>
            <span className="tabular-nums text-white">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-white to-fuchsia-200 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {stats.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm"
              >
                <p className="text-lg font-bold tabular-nums text-white">{stat.value}</p>
                <p className="text-xs font-medium text-violet-100/80">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CompanyRatingCard({
  rating,
  feedback,
  dateLabel,
}: {
  rating: number;
  feedback: string | null;
  dateLabel: string;
}) {
  return (
    <article className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <StarRating value={rating} />
          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{rating} / 5</span>
        </div>
        <time className="text-xs text-slate-500 dark:text-slate-400">{dateLabel}</time>
      </div>
      {feedback?.trim() ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{feedback.trim()}</p>
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">—</p>
      )}
    </article>
  );
}

export function computeCompanyProfileCompleteness(fields: {
  name: string;
  location: string;
  industry: string;
  website: string;
  description: string;
  hasLogo: boolean;
}): number {
  const checks = [
    Boolean(fields.name.trim()),
    Boolean(fields.location.trim()),
    Boolean(fields.industry.trim()),
    Boolean(fields.website.trim()),
    Boolean(fields.description.trim()),
    fields.hasLogo,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}
