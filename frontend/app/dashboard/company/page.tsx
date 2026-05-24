"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { Button, Modal } from "@/components/ui";
import { CompanyLogo } from "@/components/companies/CompanyLogo";
import { createClient } from "@/lib/supabase/client";
import CompanyDashboardContent, { type CompanyDashboardSummary } from "./CompanyDashboardContent";

export default function CompanyDashboardPage() {
  const [companyName, setCompanyName] = useState("Company");
  const [welcomeHint, setWelcomeHint] = useState("Manage your internships, applicants, and company activity");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [hasLogo, setHasLogo] = useState<boolean | null>(null);
  const [internshipCount, setInternshipCount] = useState<number | null>(null);
  const [loadingHeader, setLoadingHeader] = useState(true);

  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);
  const [gettingStartedStep, setGettingStartedStep] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoadingHeader(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCompanyName("Company");
        setCompanyLogoUrl(null);
        setProfileComplete(null);
        setHasLogo(null);
        setInternshipCount(null);
        setLoadingHeader(false);
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id, company_name, description, website, industry, location, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!company) {
        setCompanyName("Company");
        setCompanyLogoUrl(null);
        setProfileComplete(false);
        setHasLogo(false);
        setInternshipCount(0);
        setLoadingHeader(false);
        return;
      }

      setCompanyName(company.company_name?.trim() || "Company");
      setCompanyLogoUrl(typeof company.logo_url === "string" && company.logo_url.trim() ? company.logo_url.trim() : null);
      const complete =
        Boolean(company.company_name?.trim()) &&
        Boolean(company.description?.trim()) &&
        Boolean(company.website?.trim()) &&
        Boolean(company.industry?.trim()) &&
        Boolean(company.location?.trim());
      setProfileComplete(complete);
      setHasLogo(Boolean(company.logo_url?.trim()));

      const { count } = await supabase
        .from("internship_positions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id);
      setInternshipCount(typeof count === "number" ? count : 0);

      setLoadingHeader(false);
    };

    void load();
  }, []);

  const gettingStartedSteps = useMemo(() => {
    const hasProfile = profileComplete === true;
    const logoOk = hasLogo === true;
    const hasInternship = Boolean((internshipCount ?? 0) > 0);

    return [
      {
        title: "Complete your company profile",
        description: "Add name, description, website, industry, and location so students can trust your listing.",
        complete: hasProfile,
        ctaLabel: hasProfile ? "View profile" : "Complete profile",
        href: "/profile/company",
      },
      {
        title: "Upload your company logo",
        description: "A logo increases credibility and improves visibility across the platform.",
        complete: logoOk,
        ctaLabel: logoOk ? "View profile" : "Upload logo",
        href: "/profile/company",
      },
      {
        title: "Create your first internship",
        description: "Post an internship listing so students can start applying.",
        complete: hasInternship,
        ctaLabel: hasInternship ? "View internships" : "Create internship",
        href: hasInternship ? "/company/internships" : "/company/internships/new",
      },
      {
        title: "Review applications",
        description: "Shortlist, accept, or reject applicants from your applications inbox.",
        complete: false,
        ctaLabel: "Open applications",
        href: "/company/applications",
      },
    ] as const;
  }, [profileComplete, hasLogo, internshipCount]);

  return (
    <main className="bg-gray-50 py-6 transition-colors duration-300 sm:py-8 dark:bg-gray-950">
      <Container>
        <section className="animate-fade-up rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <CompanyLogo
                name={loadingHeader ? "Company" : companyName}
                logoUrl={companyLogoUrl}
                size="hero"
                className="shadow-md ring-4 ring-white dark:ring-gray-900"
              />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
                  Welcome back, {loadingHeader ? "…" : companyName} 👋
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{welcomeHint}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-stretch gap-3">
              <Button
                variant="primary"
                className="min-w-[13rem] justify-center px-5 py-2.5"
                onClick={() => {
                  setGettingStartedStep(0);
                  setGettingStartedOpen(true);
                }}
              >
                Getting started
              </Button>
              <Link href="/company/internships/new" className="inline-flex min-w-[13rem]">
                <Button
                  variant="primary"
                  className="w-full min-w-[13rem] justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                >
                  <span aria-hidden>＋</span>
                  Create internship
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <Modal
          isOpen={gettingStartedOpen}
          onClose={() => setGettingStartedOpen(false)}
          title={`Getting started (${gettingStartedStep + 1}/${gettingStartedSteps.length})`}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setGettingStartedStep((s) => Math.max(0, s - 1))}
                disabled={gettingStartedStep === 0}
              >
                Back
              </Button>
              {gettingStartedSteps[gettingStartedStep]?.href ? (
                <Link href={gettingStartedSteps[gettingStartedStep]!.href}>
                  <Button variant="secondary">Open</Button>
                </Link>
              ) : null}
              <Button
                variant="primary"
                onClick={() => {
                  if (gettingStartedStep >= gettingStartedSteps.length - 1) {
                    setGettingStartedOpen(false);
                  } else {
                    setGettingStartedStep((s) => Math.min(gettingStartedSteps.length - 1, s + 1));
                  }
                }}
              >
                {gettingStartedStep >= gettingStartedSteps.length - 1 ? "Finish" : "Next"}
              </Button>
            </>
          }
        >
          {(() => {
            const step = gettingStartedSteps[gettingStartedStep];
            if (!step) return null;
            return (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{step.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{step.description}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        step.complete
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      }`}
                    >
                      {step.complete ? "Done" : "To do"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  <p className="font-semibold">Your checklist</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {gettingStartedSteps.map((s, idx) => (
                      <li key={s.title} className={idx === gettingStartedStep ? "font-medium" : ""}>
                        {s.title}{" "}
                        <span className="opacity-70">
                          ({s.complete ? "done" : "to do"})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 text-sm text-gray-700 dark:border-purple-400/20 dark:bg-purple-500/10 dark:text-gray-200">
                  Tip: complete your profile + logo first to improve student trust and application quality.
                </div>
              </div>
            );
          })()}
        </Modal>

        <CompanyDashboardContent onSummary={(s: CompanyDashboardSummary) => setWelcomeHint(s.welcomeHint)} />
      </Container>
    </main>
  );
}
