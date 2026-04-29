"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui";
import { InternshipCard } from "@/components/internships/InternshipCard";
import { CompanyEvaluationPanel } from "@/components/companies/CompanyEvaluationPanel";
import { createClient } from "@/lib/supabase/client";

const locationLabel: Record<string, string> = { remote: "Remote", onsite: "On-site", hybrid: "Hybrid" };

export default function CompanyPublicProfilePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<{
    id: string;
    company_name: string | null;
    description: string | null;
    location: string | null;
    industry: string | null;
  } | null>(null);
  const [positions, setPositions] = useState<
    { id: string; title: string; location: string | null; type: string | null; requirements: string | null }[]
  >([]);
  const [canViewEvaluation, setCanViewEvaluation] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCanViewEvaluation(Boolean(user));
      if (!id) {
        setCompany(null);
        setPositions([]);
        setLoading(false);
        return;
      }

      const { data: row } = await supabase
        .from("companies")
        .select("id, company_name, description, location, industry")
        .eq("id", id)
        .maybeSingle();

      if (!row) {
        setCompany(null);
        setPositions([]);
        setLoading(false);
        return;
      }

      setCompany(row);

      const { data: posRows } = await supabase
        .from("internship_positions")
        .select("id, title, location, type, requirements")
        .eq("company_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setPositions((posRows ?? []) as typeof positions);
      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] transition-colors duration-300 dark:bg-slate-950">
        <div className="h-48 bg-[#E2E8F0] transition-colors duration-300 dark:bg-slate-800 lg:h-64" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="-mt-8 pb-8 text-sm text-[#0F172A]/70 dark:text-slate-400">Loading company…</p>
        </div>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-16 transition-colors duration-300 dark:bg-slate-950">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-[#0F172A] dark:text-white">Company not found</h1>
          <Link href="/companies" className="mt-4 inline-block text-sm font-medium text-[#7C3AED] hover:text-[#6D28D9] dark:text-violet-400">
            ← Back to companies
          </Link>
        </div>
      </main>
    );
  }

  const industryLoc = [company.industry, company.location].filter(Boolean).join(" · ");

  return (
    <main className="min-h-screen bg-[#F8FAFC] transition-colors duration-300 dark:bg-slate-950">
      <div className="h-48 bg-[#E2E8F0] transition-colors duration-300 dark:bg-slate-800 lg:h-64" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-[#F3E8FF] shadow-lg transition-colors dark:border-slate-900 dark:bg-slate-800 sm:h-32 sm:w-32">
              <span className="text-4xl font-bold text-[#7C3AED] dark:text-violet-300">
                {(company.company_name ?? "C").slice(0, 1)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">{company.company_name ?? "Company"}</h1>
              {industryLoc && <p className="mt-1 text-sm text-[#0F172A]/70 dark:text-slate-400">{industryLoc}</p>}
            </div>
          </div>
          <Button variant="secondary" className="rounded-xl shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-white" disabled>
            Follow
          </Button>
        </div>

        <section className="mt-10 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-[#0F172A] dark:text-white">Evaluation level</h2>
          <div className="mt-4">
            {canViewEvaluation ? (
              <CompanyEvaluationPanel companyId={company.id} />
            ) : (
              <p className="text-sm text-[#0F172A]/70 dark:text-slate-400">
                Sign in to view aggregated training evaluation for this company.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-[#0F172A] dark:text-white">About</h2>
          <p className="mt-3 text-sm text-[#0F172A]/80 dark:text-slate-300">
            {company.description?.trim()
              ? company.description
              : "This company has not added a description yet."}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-[#0F172A] dark:text-white">Open internships</h2>
          <p className="mt-1 text-sm text-[#0F172A]/70 dark:text-slate-400">Current openings at this company.</p>
          {positions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-[#0F172A]/60 dark:text-slate-500">No open internships at the moment.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {positions.map((i) => {
                const skills = i.requirements
                  ? i.requirements
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : [];
                const loc = locationLabel[i.type ?? ""] ?? i.type ?? i.location ?? undefined;
                return (
                  <InternshipCard
                    key={i.id}
                    id={i.id}
                    title={i.title}
                    companyName={company.company_name ?? undefined}
                    locationType={loc}
                    skills={skills}
                  />
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-8 pb-10">
          <Link href="/companies" className="text-sm font-medium text-[#7C3AED] hover:text-[#6D28D9] dark:text-violet-400">
            ← Back to companies
          </Link>
        </p>
      </div>
    </main>
  );
}
