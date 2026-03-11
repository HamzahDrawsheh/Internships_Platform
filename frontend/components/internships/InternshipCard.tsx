"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import type { Internship } from "@/lib/types";

const locationLabel: Record<string, string> = {
  remote: "Remote",
  onsite: "On-site",
  hybrid: "Hybrid",
};

function CompanyLogo({ name }: { name: string }) {
  const initial = (name || "C").charAt(0).toUpperCase();
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-lg font-semibold text-gray-600"
      aria-hidden
    >
      {initial}
    </div>
  );
}

interface InternshipCardProps {
  internship: Internship;
}

export function InternshipCard({ internship }: InternshipCardProps) {
  const companyName = internship.company_name ?? "Company";
  const location = internship.location_type
    ? locationLabel[internship.location_type] ?? internship.location_type
    : null;
  const duration =
    internship.duration_weeks != null
      ? `${internship.duration_weeks} week${internship.duration_weeks === 1 ? "" : "s"}`
      : null;
  const deadline = internship.deadline
    ? new Date(internship.deadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const skills = internship.skills ?? [];

  return (
    <article className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      {/* Company logo */}
      <CompanyLogo name={companyName} />

      <div className="min-w-0 flex-1">
        {/* Title & company */}
        <h3 className="text-lg font-semibold text-gray-900">
          <Link
            href={`/internships/${internship.id}`}
            className="hover:text-gray-700 hover:underline focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 rounded"
          >
            {internship.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm font-medium text-gray-600">{companyName}</p>

        {/* Meta: location, duration, deadline */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          {location && (
            <span className="flex items-center gap-1">
              <span className="text-gray-400" aria-hidden>
                📍
              </span>
              {location}
            </span>
          )}
          {duration && (
            <span className="flex items-center gap-1">
              <span className="text-gray-400" aria-hidden>
                ⏱
              </span>
              {duration}
            </span>
          )}
          {deadline && (
            <span className="flex items-center gap-1">
              <span className="text-gray-400" aria-hidden>
                📅
              </span>
              Apply by {deadline}
            </span>
          )}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.slice(0, 5).map((s) => (
              <span
                key={s}
                className="rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
              >
                {s}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                +{skills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={`/internships/${internship.id}`}>
            <Button variant="primary" className="min-w-[100px]">
              Apply
            </Button>
          </Link>
          <Link href={`/internships/${internship.id}`}>
            <Button variant="secondary" className="min-w-[100px]">
              View details
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
