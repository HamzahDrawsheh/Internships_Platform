import Link from "next/link";
import type { ApplicationStatus } from "@/lib/types";

function applicationStatusBadgeClasses(status: ApplicationStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200";
    case "accepted":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-200";
    case "completed":
      return "bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-blue-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200";
  }
}

function applicationStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case "pending":
      return "Applied · Pending";
    case "accepted":
      return "Applied · Accepted";
    case "rejected":
      return "Applied · Rejected";
    case "completed":
      return "Applied · Completed";
    default:
      return "Applied";
  }
}

interface InternshipCardProps {
  id: string;
  title: string;
  companyName?: string;
  companyLogoUrl?: string;
  locationType?: string;
  skills?: string[];
  deadline?: string;
  /** When set, student has already applied — shows badge to avoid re-applying blindly */
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
  return (
    <Link href={`/internships/${id}`}>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-[#0F172A] shadow-sm transition-all duration-300 hover:border-[#7C3AED]/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">
              {title}
            </h3>
            {companyName && (
              <p className="mt-1 truncate text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">
                {companyName}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {applicationStatus ? (
              <span
                className={`max-w-[11rem] truncate rounded-full px-2.5 py-1 text-center text-[10px] font-semibold leading-tight ${applicationStatusBadgeClasses(applicationStatus)}`}
                title={applicationStatusLabel(applicationStatus)}
              >
                {applicationStatusLabel(applicationStatus)}
              </span>
            ) : null}
            {companyName ? (
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#F3E8FF] transition-colors duration-300 dark:bg-slate-800">
                {companyLogoUrl ? (
                  <img src={companyLogoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-[#7C3AED] dark:text-violet-300">
                    {companyName.slice(0, 1)}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {locationType && (
            <span className="rounded-lg bg-[#F3E8FF] px-2 py-1 text-xs font-medium text-[#7C3AED]">
              {locationType}
            </span>
          )}
          {skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-lg bg-[#F8FAFC] px-2 py-1 text-xs text-[#0F172A]/80 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-300">
              {s}
            </span>
          ))}
        </div>
        {deadline && <p className="mt-3 text-xs text-[#0F172A]/60 transition-colors duration-300 dark:text-slate-400">Deadline: {deadline}</p>}
      </div>
    </Link>
  );
}
