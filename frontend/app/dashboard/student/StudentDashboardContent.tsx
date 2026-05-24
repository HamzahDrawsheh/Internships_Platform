"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { invokeAutoCompleteExpiredTrainings } from "@/lib/auto-complete-expired-trainings";
import { createClient } from "@/lib/supabase/client";
import type { Application } from "@/lib/types";
import { StudentInternshipTrackCard } from "@/components/dashboard/StudentInternshipTrackCard";
import { DashboardReportWidget } from "@/components/internship-reports/DashboardReportWidget";
import { DashboardPageSkeleton } from "@/components/loading";
import { Button, Modal } from "@/components/ui";
import { canStudentSubmitReport } from "@/lib/internship-reports/helpers";
import { buildInternshipTrackSummary } from "@/lib/internship-reports/track-summary";
import type { MonthlyReportRow } from "@/lib/internship-reports/types";
import { ensureStudentInternshipTracking } from "@/lib/internship-reports/sync-status";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { localizeTrackHint } from "@/lib/i18n/track-display";

type EnrolledInternship = {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  position_title: string;
  company_name: string;
  track: ReturnType<typeof buildInternshipTrackSummary>;
};

export default function StudentDashboardContent() {
  const { t } = useI18n();
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
  const [enrolledInternship, setEnrolledInternship] = useState<EnrolledInternship | null>(null);

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

      const loadInternshipTracking = async () => {
        try {
          await ensureStudentInternshipTracking(supabase);
          const { data: internships } = await supabase
            .from("internships")
            .select("id, status, start_date, end_date, application_id")
            .eq("student_id", student.id)
            .neq("status", "cancelled")
            .order("created_at", { ascending: false });

          const primary = (internships ?? [])[0];
          if (!primary) {
            setEnrolledInternship(null);
            setReportsDueCount(0);
            return;
          }

          let due = 0;
          if (primary.status === "pending_supervisor_approval") {
            due = 1;
          } else {
            const { data: reps } = await supabase
              .from("internship_monthly_reports")
              .select("*")
              .eq("internship_id", primary.id);
            const reports = (reps ?? []) as MonthlyReportRow[];
            due = reports.filter((r) => canStudentSubmitReport(r, reports)).length;
          }
          setReportsDueCount(due);

          const { data: app } = await supabase
            .from("applications")
            .select("position_id, internship_positions(title, companies(company_name))")
            .eq("id", primary.application_id)
            .maybeSingle();
          const pos = app?.internship_positions as { title?: string; companies?: { company_name?: string } } | null;

          const { data: reps } = await supabase
            .from("internship_monthly_reports")
            .select("*")
            .eq("internship_id", primary.id)
            .order("month_number");
          const reports = (reps ?? []) as MonthlyReportRow[];

          setEnrolledInternship({
            id: primary.id,
            status: primary.status,
            start_date: primary.start_date,
            end_date: primary.end_date,
            position_title: pos?.title ?? "Internship",
            company_name: pos?.companies?.company_name ?? "Company",
            track: buildInternshipTrackSummary(
              reports,
              primary.start_date,
              primary.end_date,
              primary.status,
              due,
            ),
          });
        } catch {
          setEnrolledInternship(null);
          setReportsDueCount(0);
        }
      };

      const { data: appRows, error: appError } = await supabase
        .from("applications")
        .select("id, student_id, position_id, status, message, applied_at")
        .eq("student_id", student.id)
        .order("applied_at", { ascending: false });

      if (appError || !appRows?.length) {
        setApplications([]);
        await loadInternshipTracking();
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
      await loadInternshipTracking();
      setLoading(false);
    };

    load();
  }, []);

  const total = applications.length;
  const pending = applications.filter((a) => a.status === "pending").length;
  const active = applications.filter((a) => a.status === "accepted").length;
  const completed = applications.filter((a) => a.status === "completed").length;
  const recent = applications.slice(0, 5);

  const hasDepartment = Boolean(studentMeta?.department && studentMeta.department.trim());
  const hasCv = Boolean(studentMeta?.cv_path && studentMeta.cv_path.trim());
  const hasApplied = total > 0;
  const hasCompletedTraining = applications.some((a) => a.status === "completed");

  const welcomeSubtitle = enrolledInternship
    ? localizeTrackHint(enrolledInternship.track.hint, t)
    : pending > 0
      ? pending === 1
        ? t("dashboard.student.oneApplicationPending")
        : fmt(t("dashboard.student.applicationsPending"), { count: pending })
      : t("dashboard.student.trackProgress");

  const gettingStartedSteps: Array<{
    title: string;
    description: string;
    complete: boolean;
    ctaLabel: string;
    href?: string;
  }> = [
    {
      title: t("dashboard.student.stepProfileTitle"),
      description: t("dashboard.student.stepProfileDesc"),
      complete: hasDepartment,
      ctaLabel: hasDepartment ? t("dashboard.student.stepProfileCtaDone") : t("dashboard.student.stepProfileCtaTodo"),
      href: "/profile/student",
    },
    {
      title: t("dashboard.student.stepCvTitle"),
      description: t("dashboard.student.stepCvDesc"),
      complete: hasCv,
      ctaLabel: hasCv ? t("dashboard.student.stepCvCtaDone") : t("dashboard.student.stepCvCtaTodo"),
      href: "/profile/student",
    },
    {
      title: t("dashboard.student.stepBrowseTitle"),
      description: t("dashboard.student.stepBrowseDesc"),
      complete: hasApplied,
      ctaLabel: hasApplied ? t("dashboard.student.stepBrowseCtaDone") : t("dashboard.student.stepBrowseCtaTodo"),
      href: "/internships",
    },
    {
      title: t("dashboard.student.stepTrackTitle"),
      description: t("dashboard.student.stepTrackDesc"),
      complete: hasCompletedTraining,
      ctaLabel: t("dashboard.student.stepTrackCta"),
      href: "/applications",
    },
  ];

  if (loading) {
    return <DashboardPageSkeleton showTrack showWidget showTable />;
  }

  const stats = [
    {
      label: t("dashboard.student.totalApplications"),
      value: total,
      cardClass: "bg-purple-100 text-purple-900 dark:bg-purple-500/10 dark:text-purple-300",
    },
    {
      label: t("dashboard.student.pending"),
      value: pending,
      cardClass: "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/10 dark:text-yellow-300",
    },
    {
      label: t("dashboard.student.active"),
      value: active,
      cardClass: "bg-green-100 text-green-900 dark:bg-green-500/10 dark:text-green-300",
    },
    {
      label: t("dashboard.student.completed"),
      value: completed,
      cardClass: "bg-sky-100 text-sky-900 dark:bg-sky-500/10 dark:text-sky-300",
    },
  ];

  const applicationStatusLabel = (status: Application["status"]) => {
    if (status === "pending") return t("dashboard.student.statusPending");
    if (status === "accepted") return t("dashboard.student.statusAccepted");
    if (status === "rejected") return t("dashboard.student.statusRejected");
    if (status === "completed") return t("dashboard.student.statusCompletedApp");
    return status;
  };

  const getStatusClasses = (status: Application["status"]) => {
    if (status === "accepted") {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
    }
    if (status === "completed") {
      return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300";
    }
    if (status === "rejected") {
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
    }
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  };

  return (
    <div className="space-y-8">
      <section className="animate-fade-up rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
              {t("dashboard.welcomeBack")}, {userName} 👋
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{welcomeSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => { setGettingStartedStep(0); setGettingStartedOpen(true); }}>
              {t("dashboard.gettingStarted")}
            </Button>
            <Link
              href="/profile/student"
              className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300 dark:focus-visible:ring-offset-gray-900"
            >
              {t("common.updateProfile")}
            </Link>
          </div>
        </div>
      </section>

      <DashboardReportWidget
        count={reportsDueCount}
        href="/dashboard/student/internship-reports"
        label={
          reportsDueCount === 1
            ? t("dashboard.student.reportDueOne")
            : t("dashboard.student.reportDueMany")
        }
      />

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

      {enrolledInternship ? (
        <StudentInternshipTrackCard
          positionTitle={enrolledInternship.position_title}
          companyName={enrolledInternship.company_name}
          startDate={enrolledInternship.start_date}
          endDate={enrolledInternship.end_date}
          track={enrolledInternship.track}
        />
      ) : null}

      {(active > 0 || completed > 0) && !enrolledInternship && (
        <Link
          href="/dashboard/student/internship-reports"
          className="block rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-5 transition hover:border-purple-300 dark:border-purple-900/50 dark:from-purple-950/30 dark:to-indigo-950/20"
        >
          <p className="font-semibold text-purple-900 dark:text-purple-200">{t("dashboard.student.monthlyReportsLink")}</p>
          <p className="mt-1 text-sm text-purple-800/80 dark:text-purple-300/80">
            {t("dashboard.student.monthlyReportsLinkDesc")}
          </p>
        </Link>
      )}

      <Modal
        isOpen={gettingStartedOpen}
        onClose={() => setGettingStartedOpen(false)}
        title={fmt(t("dashboard.student.gettingStartedProgress"), {
          step: gettingStartedStep + 1,
          total: gettingStartedSteps.length,
        })}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setGettingStartedStep((s) => Math.max(0, s - 1))}
              disabled={gettingStartedStep === 0}
            >
              {t("common.back")}
            </Button>
            {gettingStartedSteps[gettingStartedStep]?.href ? (
              <Link href={gettingStartedSteps[gettingStartedStep]!.href!}>
                <Button variant="secondary">{t("common.open")}</Button>
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
              {gettingStartedStep >= gettingStartedSteps.length - 1 ? t("common.finish") : t("common.next")}
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
                    {step.complete ? t("dashboard.student.doneLabel") : t("dashboard.student.todoLabel")}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <p className="font-semibold">{t("dashboard.student.yourChecklist")}</p>
                <ul className="list-disc space-y-1 ps-5">
                  {gettingStartedSteps.map((s, idx) => (
                    <li key={s.title} className={idx === gettingStartedStep ? "font-medium" : ""}>
                      {s.title}{" "}
                      <span className="opacity-70">
                        ({s.complete ? t("dashboard.student.doneStatus") : t("dashboard.student.todoStatus")})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 text-sm text-gray-700 dark:border-purple-400/20 dark:bg-purple-500/10 dark:text-gray-200">
                {t("dashboard.student.tipAssistant")}
              </div>
            </div>
          );
        })()}
      </Modal>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.student.recentApplications")}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t("dashboard.student.latestActivity")}</p>
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-2xl dark:bg-purple-500/15">
              <span aria-hidden>🧭</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.student.noApplicationsYet")}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {t("dashboard.student.noApplicationsDesc")}
            </p>
            <Link
              href="/internships"
              className="mt-5 inline-flex items-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            >
              {t("nav.browseInternships")}
            </Link>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    {t("dashboard.student.internshipCol")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    {t("dashboard.student.companyCol")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    {t("dashboard.student.appliedDateCol")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    {t("dashboard.student.statusCol")}
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    {t("dashboard.student.actionCol")}
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
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(app.status)}`}
                      >
                        {applicationStatusLabel(app.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-end">
                      <Link
                        href={`/internships/${app.position_id}`}
                        className="inline-flex rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 transition-all duration-300 hover:bg-purple-50 hover:text-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-purple-400/40 dark:text-purple-300 dark:hover:bg-purple-500/15 dark:hover:text-purple-200 dark:focus-visible:ring-offset-gray-900"
                      >
                        {t("dashboard.student.view")}
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
