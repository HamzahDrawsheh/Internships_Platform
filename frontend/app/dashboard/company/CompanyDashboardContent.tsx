"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TableSectionSkeleton } from "@/components/loading";
import { Table, Badge } from "@/components/ui";
import { CompanyAiFeedbackSummary } from "@/components/companies/CompanyAiFeedbackSummary";
import { CompanyDashboardWidgetsSection } from "@/components/dashboard/company/CompanyDashboardWidgetsSection";
import { DashboardReportWidget } from "@/components/internship-reports/DashboardReportWidget";
import { syncInternshipReportStatuses } from "@/lib/internship-reports/sync-status";
import type { MonthlyReportRow } from "@/lib/internship-reports/types";

type Row = { id: string; status: string; applied_at: string; internship_title?: string; student_name?: string };
type RatingRow = { id: string; rating: number; feedback: string | null; created_at: string };

type TraineeOverview = {
  activeTrainees: number;
  overallPercent: number;
  approvedReports: number;
  totalReports: number;
  hint: string;
};

export type CompanyDashboardSummary = {
  pendingApplications: number;
  pendingEvaluations: number;
  welcomeHint: string;
};

type Props = {
  onSummary?: (summary: CompanyDashboardSummary) => void;
};

export default function CompanyDashboardContent({ onSummary }: Props) {
  const [pendingCount, setPendingCount] = useState(0);
  const [recentApplicants, setRecentApplicants] = useState<Row[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [companyRecordId, setCompanyRecordId] = useState<string | null>(null);
  const [pendingEvalCount, setPendingEvalCount] = useState(0);
  const [traineeOverview, setTraineeOverview] = useState<TraineeOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setCompanyRecordId(null);
        setLoading(false);
        return;
      }

      const { data: company } = await supabase.from("companies").select("id").eq("user_id", user.id).single();

      if (!company) {
        setCompanyRecordId(null);
        setRecentApplicants([]);
        setRatings([]);
        setAverageRating(null);
        setTraineeOverview(null);
        setLoading(false);
        return;
      }

      setCompanyRecordId(company.id);

      const { data: positions } = await supabase
        .from("internship_positions")
        .select("id, title")
        .eq("company_id", company.id);

      const positionIds = (positions ?? []).map((p) => p.id);
      if (positionIds.length === 0) {
        setPendingCount(0);
        setRecentApplicants([]);
        setTraineeOverview(null);
        setLoading(false);
        return;
      }

      const { data: applicationRows } = await supabase
        .from("applications")
        .select("id, status, applied_at, student_id, position_id")
        .in("position_id", positionIds)
        .order("applied_at", { ascending: false });

      const allApplications = applicationRows ?? [];
      setPendingCount(allApplications.filter((a) => a.status === "pending").length);

      const recent = allApplications.slice(0, 5);
      const studentsIds = [...new Set(recent.map((r) => r.student_id))];
      const { data: students } = studentsIds.length
        ? await supabase.from("students").select("id, user_id").in("id", studentsIds)
        : { data: [] as { id: string; user_id: string }[] };
      const studentUserByStudentId = new Map((students ?? []).map((s) => [s.id, s.user_id]));
      const profileUserIds = [...new Set((students ?? []).map((s) => s.user_id))];
      const { data: profiles } = profileUserIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", profileUserIds)
        : { data: [] as { id: string; full_name: string | null }[] };
      const profileNameByUserId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      const titleByPositionId = new Map((positions ?? []).map((p) => [p.id, p.title]));

      setRecentApplicants(
        recent.map((row) => {
          const profileId = studentUserByStudentId.get(row.student_id);
          return {
            id: row.id,
            status: row.status,
            applied_at: row.applied_at,
            internship_title: titleByPositionId.get(row.position_id) ?? "—",
            student_name: profileId ? profileNameByUserId.get(profileId) ?? "—" : "—",
          };
        }),
      );

      const { data: ratingRows } = await supabase
        .from("ratings")
        .select("id, rating, feedback, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const safeRatings = ratingRows ?? [];
      setRatings(safeRatings);
      if (safeRatings.length > 0) {
        const total = safeRatings.reduce((sum, r) => sum + Number(r.rating), 0);
        setAverageRating(total / safeRatings.length);
      } else {
        setAverageRating(null);
      }

      const { data: internships } = await supabase
        .from("internships")
        .select("id, status")
        .eq("company_id", company.id)
        .in("status", ["active", "completed"]);

      let evalPending = 0;
      let approvedReports = 0;
      let totalReports = 0;
      let activeTrainees = 0;

      for (const i of internships ?? []) {
        if (i.status === "active") activeTrainees += 1;
        await syncInternshipReportStatuses(supabase, i.id);
        const { data: reps } = await supabase.from("internship_monthly_reports").select("*").eq("internship_id", i.id);
        const reports = (reps ?? []) as MonthlyReportRow[];
        totalReports += reports.length;
        approvedReports += reports.filter((r) => r.status === "approved").length;
        evalPending += reports.filter((r) => r.status === "pending_employer" || r.status === "overdue").length;
      }
      setPendingEvalCount(evalPending);

      if ((internships ?? []).length > 0) {
        const realPercent = totalReports > 0 ? Math.round((approvedReports / totalReports) * 100) : 0;
        let hint = `${activeTrainees} active trainee${activeTrainees === 1 ? "" : "s"}.`;
        if (evalPending > 0) {
          hint = `${evalPending} monthly evaluation${evalPending === 1 ? "" : "s"} waiting for you.`;
        } else if (realPercent === 100 && activeTrainees === 0) {
          hint = "All trainee programs completed.";
        } else if (approvedReports > 0) {
          hint = `${approvedReports} of ${totalReports} monthly reports approved across trainees.`;
        }

        setTraineeOverview({
          activeTrainees,
          overallPercent: realPercent,
          approvedReports,
          totalReports,
          hint,
        });
      } else {
        setTraineeOverview(null);
      }

      setLoading(false);
    });
  }, []);

  const welcomeHint = useMemo(() => {
    if (pendingEvalCount > 0) {
      return `${pendingEvalCount} trainee evaluation${pendingEvalCount === 1 ? "" : "s"} need your review.`;
    }
    if (pendingCount > 0) {
      return `${pendingCount} application${pendingCount === 1 ? "" : "s"} waiting for your decision.`;
    }
    if (traineeOverview?.activeTrainees) {
      return traineeOverview.hint;
    }
    return "Manage your internships, applicants, and company activity";
  }, [pendingEvalCount, pendingCount, traineeOverview]);

  useEffect(() => {
    onSummary?.({
      pendingApplications: pendingCount,
      pendingEvaluations: pendingEvalCount,
      welcomeHint,
    });
  }, [onSummary, pendingCount, pendingEvalCount, welcomeHint]);

  if (loading) {
    return (
      <div className="mt-8 space-y-6">
        <TableSectionSkeleton />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <CompanyDashboardWidgetsSection />

      <DashboardReportWidget
        count={pendingEvalCount}
        href="/company/internship-reports"
        label={pendingEvalCount === 1 ? "evaluation pending" : "evaluations pending"}
      />

      {companyRecordId ? <CompanyAiFeedbackSummary companyId={companyRecordId} /> : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Company ratings</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Feedback shared by students about their internship experience</p>
          </div>
          <p className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {averageRating ? `Average ${averageRating.toFixed(1)} / 5` : "No ratings yet"}
          </p>
        </div>
        {ratings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">No ratings yet</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Ratings from students will appear here once submitted.</p>
          </div>
        ) : (
          <Table headers={["Rating", "Feedback", "Date"]} className="mt-5">
            {ratings.map((r) => (
              <tr key={r.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">{r.rating} / 5</td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-slate-300">{r.feedback ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-slate-300">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent applicants</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Review your latest internship applicants</p>
        {recentApplicants.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">No applicants yet</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Applicants will appear here as soon as students apply to your internships.</p>
          </div>
        ) : (
          <Table headers={["Student", "Internship", "Applied", "Status"]} className="mt-5">
            {recentApplicants.map((a) => (
              <tr key={a.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">{a.student_name ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-slate-300">{a.internship_title ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-slate-300">{a.applied_at ? new Date(a.applied_at).toLocaleDateString() : "—"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm capitalize">
                  <Badge
                    variant={
                      a.status === "accepted" ? "success" : a.status === "completed" ? "info" : a.status === "rejected" ? "danger" : "warning"
                    }
                  >
                    {a.status === "accepted" ? "active" : String(a.status).replace("_", " ")}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
