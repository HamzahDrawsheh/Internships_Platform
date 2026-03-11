"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { Internship } from "@/lib/types";

const locationLabel: Record<string, string> = {
  remote: "Remote",
  onsite: "On-site",
  hybrid: "Hybrid",
};

function FeaturedCard({ internship }: { internship: Internship }) {
  const companyName = internship.company_name ?? "Company";
  const initial = companyName.charAt(0).toUpperCase();
  const location = internship.location_type
    ? locationLabel[internship.location_type] ?? internship.location_type
    : null;
  const duration =
    internship.duration_weeks != null ? `${internship.duration_weeks} weeks` : null;
  const skills = (internship.skills ?? []).slice(0, 3);

  return (
    <Link
      href={`/internships/${internship.id}`}
      className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 text-base font-semibold text-gray-600">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">{internship.title}</h3>
        <p className="mt-0.5 text-sm text-gray-600">{companyName}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {location && <span>{location}</span>}
          {duration && <span>·</span>}
          {duration && <span>{duration}</span>}
        </div>
        {skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {skills.map((s) => (
              <span
                key={s}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function FeaturedInternships() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("internships")
      .select(
        `
        id,
        company_id,
        title,
        description,
        location_type,
        skills,
        duration_weeks,
        start_date,
        deadline,
        open_positions,
        status,
        company:profiles!company_id(full_name)
      `
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (error) {
          setInternships([]);
          setLoading(false);
          return;
        }
        const rows = (data ?? []).map((row: Record<string, unknown>) => {
          const company = row.company as { full_name?: string } | null;
          return {
            ...row,
            company_name: company?.full_name ?? null,
          } as Internship;
        });
        setInternships(rows);
        setLoading(false);
      });
  }, []);

  return (
    <section className="border-t border-gray-200 bg-gray-50/30 py-20 sm:py-28" id="internships">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Featured internships
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Recent opportunities from companies on the platform.
          </p>
        </div>
        {loading ? (
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white"
              />
            ))}
          </div>
        ) : internships.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">
              Internships will appear here once companies post listings.{" "}
              <Link href="/auth/signup" className="font-medium text-gray-900 hover:underline">
                Sign up
              </Link>{" "}
              to create an account and post as a company.
            </p>
          </div>
        ) : (
          <>
            <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {internships.map((internship) => (
                <FeaturedCard key={internship.id} internship={internship} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/internships">
                <Button variant="primary">View all internships</Button>
              </Link>
            </div>
          </>
        )}
      </Container>
    </section>
  );
}
