"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { invokeAutoCompleteExpiredTrainings } from "@/lib/auto-complete-expired-trainings";
import { createClient } from "@/lib/supabase/client";
import type { Application } from "@/lib/types";
import StudentAssistantChat from "@/components/chat/StudentAssistantChat";
import { DashboardReportWidget } from "@/components/internship-reports/DashboardReportWidget";
import { Button, Modal } from "@/components/ui";
import { canStudentSubmitReport } from "@/lib/internship-reports/helpers";
import { ensureStudentInternshipTracking } from "@/lib/internship-reports/sync-status";

export default function StudentDashboardContent() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Student");
  const [studentMeta, setStudentMeta] = useState<{
    department: string | null;
    cv_path: string | null;
  } | null>(null);

  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);
  const [gettingStartedStep, setGettingStartedStep] = useState(0);
  const [reportsDueCount, setReportsDueCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUserName("Student");
        setApplications([]);
        setLoading(false);
        return;
      }

      const fallbackName = user.email?.split("@")[0] || "Student";
      const metadataName =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
        fallbackName;
      setUserName(metadataName);

      const { data: student } = await supabase
        .from("students")
        .select("id, department, cv_path")
        .eq("user_id", user.id)
        .single();

      if (!student) {
        setApplications([]);
        setStudentMeta(null);
        setLoading(false);
        return;
      }

      setStudentMeta({
        department: typeof student.department === "string" ? student.department : null,
        cv_path: typeof student.cv_path === "string" ? student.cv_path : null,
      });

      await invokeAutoCompleteExpiredTrainings(supabase);

      const { data: appRows, error: appError } = await supabase
        .from("applications")
        .select("id, student_id, position_id, status, message, applied_at")
        .eq("student_id", student.id)
        .order("applied_at", { ascending: false });

      if (appError || !appRows?.length) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const positionIds = [...new Set(appRows.map((row) => row.position_id))];
      const { data: positions } = await supabase
        .from("internship_positions")
        .select("id, title, company_id")
        .in("id", positionIds);

      const positionsById = new Map((positions ?? []).map((p) => [p.id, p]));
      const companyIds = [...new Set((positions ?? []).map((p) => p.company_id))];
      const { data: companies } = companyIds.length
        ? await supabase.from("companies").select("id, company_name").in("id", companyIds)
        : { data: [] as { id: string; company_name: string }[] };
      const companiesById = new Map((companies ?? []).map((c) => [c.id, c.company_name]));

      const mapped: Application[] = appRows.map((row) => {
        const pos = positionsById.get(row.position_id);
        return {
          id: row.id,
          student_id: row.student_id,
          position_id: row.position_id,
          status: row.status,
          message: row.message,
          applied_at: row.applied_at,
          internship_title: pos?.title ?? null,
          company_name: pos ? companiesById.get(pos.company_id) ?? null : null,
        };
      });

      setApplications(mapped);

      try {
        await ensureStudentInternshipTracking(supabase);
        const { data: internships } = await supabase
          .from("internships")
          .select("id, status")
          .eq("student_id", student.id)
          .in("status", ["active", "pending_supervisor_approval"]);
        let due = 0;
        for (const i of internships ?? []) {
          if (i.status === "pending_supervisor_approval") {
            due += 1;
            continue;
          }
          const { data: reps } = await supabase
            .from("internship_monthly_reports")
            .select("*")
            .eq("internship_id", i.id);
          due += (reps ?? []).filter((r) => canStudentSubmitReport(r, reps ?? [])).length;
        }
        setReportsDueCount(due);
      } catch {
        setReportsDueCount(0);
      }

      setLoading(false);
    };

    load();
  }, []);

  const total = applications.length;
  const pending = applications.filter((a) => a.status === "pending").length;
  const accepted = applications.filter((a) => a.status === "accepted").length;
  const rejected = applications.filter((a) => a.status === "rejected").length;
  const recent = applications.slice(0, 5);

  const hasDepartment = Boolean(studentMeta?.department && studentMeta.department.trim());
  const hasCv = Boolean(studentMeta?.cv_path && studentMeta.cv_path.trim());
  const hasApplied = total > 0;
  const hasCompletedTraining = applications.some((a) => a.status === "completed");

  const gettingStartedSteps: Array<{
    title: string;
    description: string;
    complete: boolean;
    ctaLabel: string;
    href?: string;
  }> = [
    {
      title: "Complete your profile",
      description: "Add your department, skills, and preferences so we can personalize recommendations.",
      complete: hasDepartment,
      ctaLabel: hasDepartment ? "View profile" : "Complete profile",
      href: "/profile/student",
    },
    {
      title: "Upload your CV (optional but recommended)",
      description: "A CV helps companies review your application faster.",
      complete: hasCv,
      ctaLabel: hasCv ? "View profile" : "Upload CV",
      href: "/profile/student",
    },
    {
      title: "Browse & apply",
      description: "Explore internships and submit your first application.",
      complete: hasApplied,
      ctaLabel: hasApplied ? "Browse more" : "Browse internships",
      href: "/internships",
    },
    {
      title: "Track applications & feedback",
      description: "Monitor your application statuses and add training evaluations after completing an internship.",
      complete: hasCompletedTraining,
      ctaLabel: "View applications",
      href: "/applications",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="h-7 w-56 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-3 h-4 w-72 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-4 h-8 w-12 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Applications",
      value: total,
      cardClass: "bg-purple-100 text-purple-900 dark:bg-purple-500/10 dark:text-purple-300",
    },
    {
      label: "Pending",
      value: pending,
      cardClass: "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/10 dark:text-yellow-300",
    },
    {
      label: "Accepted",
      value: accepted,
      cardClass: "bg-green-100 text-green-900 dark:bg-green-500/10 dark:text-green-300",
    },
    {
      label: "Rejected",
      value: rejected,
      cardClass: "bg-red-100 text-red-900 dark:bg-red-500/10 dark:text-red-300",
    },
  ];

  const getStatusClasses = (status: Application["status"]) => {
    if (status === "accepted") {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
    }
    if (status === "rejected") {
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
    }
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  };

  return (
    <div className="space-y-8">
      <StudentAssistantChat />
      <section className="animate-fade-up rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
              Welcome back, {userName} 👋
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Track your internship journey and progress
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => { setGettingStartedStep(0); setGettingStartedOpen(true); }}>
              Getting started
            </Button>
            <Link
              href="/profile/student"
              className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300 dark:focus-visible:ring-offset-gray-900"
            >
              Update Profile
            </Link>
          </div>
        </div>
      </section>

      <DashboardReportWidget
        count={reportsDueCount}
        href="/dashboard/student/internship-reports"
        label={reportsDueCount === 1 ? "report due — open monthly reports" : "reports due — open monthly reports"}
      />

      {accepted > 0 && (
        <Link
          href="/dashboard/student/internship-reports"
          className="block rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-5 transition hover:border-purple-300 dark:border-purple-900/50 dark:from-purple-950/30 dark:to-indigo-950/20"
        >
          <p className="font-semibold text-purple-900 dark:text-purple-200">Monthly internship reports</p>
          <p className="mt-1 text-sm text-purple-800/80 dark:text-purple-300/80">
            Submit JUST monthly evaluation forms, track attendance, and upload your final report.
          </p>
        </Link>
      )}

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
              <Link href={gettingStartedSteps[gettingStartedStep]!.href!}>
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
                Tip: you can ask the assistant “what are the getting started steps?” and it will explain the sequence.
              </div>
            </div>
          );
        })()}
      </Modal>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item, idx) => (
          <article
            key={item.label}
            className={`animate-fade-up rounded-2xl p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${item.cardClass}`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-4 text-3xl font-bold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Applications</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Your latest internship activity</p>
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-2xl dark:bg-purple-500/15">
              <span aria-hidden>🧭</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">You haven&apos;t applied yet</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Start exploring internships and submit your first application.
            </p>
            <Link
              href="/internships"
              className="mt-5 inline-flex items-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            >
              Browse Internships
            </Link>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Internship
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Applied Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                {recent.map((app) => (
                  <tr key={app.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {app.internship_title ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {app.company_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClasses(app.status)}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <Link
                        href={`/internships/${app.position_id}`}
                        className="inline-flex rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 transition-all duration-300 hover:bg-purple-50 hover:text-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-purple-400/40 dark:text-purple-300 dark:hover:bg-purple-500/15 dark:hover:text-purple-200 dark:focus-visible:ring-offset-gray-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
