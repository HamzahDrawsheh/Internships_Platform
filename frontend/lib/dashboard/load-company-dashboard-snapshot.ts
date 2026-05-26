import { fetchCompanyEvaluation, type CompanyEvaluationSummary } from "@/lib/companies/evaluation";
import {
  aggregateTrainingDimensionAvgs,
  fetchCompanyStudentFeedbacks,
  type TrainingDimensionAvgs,
} from "@/lib/companies/feedbacks";
import { buildInternshipTrackSummary, type InternshipTrackSummary } from "@/lib/internship-reports/track-summary";
import { syncInternshipReportStatuses } from "@/lib/internship-reports/sync-status";
import type { MonthlyReportRow } from "@/lib/internship-reports/types";
import { createClient } from "@/lib/supabase/client";

export type CompanyListingSnapshot = {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  applicantCount: number;
};

export type CompanyTraineeSnapshot = {
  internshipId: string;
  studentName: string;
  positionTitle: string;
  startDate: string;
  endDate: string;
  status: string;
  track: InternshipTrackSummary;
  evalPending: number;
};

export type CompanyDimensionAvgs = TrainingDimensionAvgs;

export type CompanyDashboardSnapshot = {
  companyId: string;
  evaluation: CompanyEvaluationSummary | null;
  dimensionAvgs: CompanyDimensionAvgs | null;
  weakestDimension: keyof CompanyDimensionAvgs | null;
  pendingEvalCount: number;
  pendingApplicationCount: number;
  applicationStats: {
    total: number;
    pending: number;
    active: number;
    completed: number;
  };
  listings: CompanyListingSnapshot[];
  activeListingCount: number;
  pausedListingCount: number;
  totalApplicantCount: number;
  applicationsThisWeek: number;
  trainees: CompanyTraineeSnapshot[];
  activeTrainees: CompanyTraineeSnapshot[];
  traineeOverview: {
    activeCount: number;
    approvedReports: number;
    totalReports: number;
    overallPercent: number;
  };
  trainingFeedbackCount: number;
};

function daysAgo(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t >= days * 24 * 60 * 60 * 1000;
}

export async function fetchCompanyDashboardSnapshot(): Promise<CompanyDashboardSnapshot | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) return null;

  const { summary: evaluation } = await fetchCompanyEvaluation(supabase, company.id);

  const { feedbacks: studentFeedbacks } = await fetchCompanyStudentFeedbacks(supabase, company.id);
  const trainingFeedbackCount = studentFeedbacks.filter((f) => f.source === "training").length;
  const { avgs: dimensionAvgs, weakest: weakestDimension } =
    aggregateTrainingDimensionAvgs(studentFeedbacks);

  const { data: positions } = await supabase
    .from("internship_positions")
    .select("id, title, is_active, created_at")
    .eq("company_id", company.id);

  const positionRows = positions ?? [];
  const positionIds = positionRows.map((p) => p.id);
  const titleByPositionId = new Map(positionRows.map((p) => [p.id, p.title]));

  let applicationRows: { id: string; status: string; applied_at: string; position_id: string; student_id: string }[] =
    [];
  if (positionIds.length > 0) {
    const { data: apps } = await supabase
      .from("applications")
      .select("id, status, applied_at, position_id, student_id")
      .in("position_id", positionIds);
    applicationRows = apps ?? [];
  }

  const applicantCountByPosition = new Map<string, number>();
  for (const app of applicationRows) {
    applicantCountByPosition.set(app.position_id, (applicantCountByPosition.get(app.position_id) ?? 0) + 1);
  }

  const listings: CompanyListingSnapshot[] = positionRows.map((p) => ({
    id: p.id,
    title: p.title,
    isActive: p.is_active !== false,
    createdAt: p.created_at,
    applicantCount: applicantCountByPosition.get(p.id) ?? 0,
  }));

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const applicationsThisWeek = applicationRows.filter(
    (a) => new Date(a.applied_at).getTime() >= weekAgo,
  ).length;

  const pendingApplicationCount = applicationRows.filter((a) => a.status === "pending").length;

  // Trainees
  const { data: internships } = await supabase
    .from("internships")
    .select("id, student_id, application_id, status, start_date, end_date")
    .eq("company_id", company.id)
    .in("status", ["active", "completed", "pending_supervisor_approval"])
    .order("created_at", { ascending: false });

  const trainees: CompanyTraineeSnapshot[] = [];
  let pendingEvalCount = 0;
  let approvedReports = 0;
  let totalReports = 0;

  for (const i of internships ?? []) {
    await syncInternshipReportStatuses(supabase, i.id);
    const [{ data: st }, { data: reps }, { data: app }] = await Promise.all([
      supabase.from("students").select("user_id").eq("id", i.student_id).maybeSingle(),
      supabase.from("internship_monthly_reports").select("*").eq("internship_id", i.id).order("month_number"),
      supabase.from("applications").select("position_id").eq("id", i.application_id).maybeSingle(),
    ]);

    let studentName = "Trainee";
    if (st?.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", st.user_id)
        .maybeSingle();
      studentName = profile?.full_name?.trim() || studentName;
    }

    const reports = (reps ?? []) as MonthlyReportRow[];
    const evalPending = reports.filter((r) => r.status === "pending_employer" || r.status === "overdue").length;
    pendingEvalCount += evalPending;
    approvedReports += reports.filter((r) => r.status === "approved").length;
    totalReports += reports.length;

    const positionTitle = app?.position_id
      ? titleByPositionId.get(app.position_id) ?? "Internship"
      : "Internship";

    trainees.push({
      internshipId: i.id,
      studentName,
      positionTitle,
      startDate: i.start_date,
      endDate: i.end_date,
      status: i.status,
      track: buildInternshipTrackSummary(reports, i.start_date, i.end_date, i.status, evalPending),
      evalPending,
    });
  }

  const activeTrainees = trainees.filter((t) => t.status === "active");

  return {
    companyId: company.id,
    evaluation,
    dimensionAvgs,
    weakestDimension,
    pendingEvalCount,
    pendingApplicationCount,
    applicationStats: {
      total: applicationRows.length,
      pending: applicationRows.filter((a) => a.status === "pending").length,
      active: applicationRows.filter((a) => a.status === "accepted").length,
      completed: applicationRows.filter((a) => a.status === "completed").length,
    },
    listings,
    activeListingCount: listings.filter((l) => l.isActive).length,
    pausedListingCount: listings.filter((l) => !l.isActive).length,
    totalApplicantCount: applicationRows.length,
    applicationsThisWeek,
    trainees,
    activeTrainees,
    traineeOverview: {
      activeCount: activeTrainees.length,
      approvedReports,
      totalReports,
      overallPercent: totalReports > 0 ? Math.round((approvedReports / totalReports) * 100) : 0,
    },
    trainingFeedbackCount,
  };
}

export function findStaleListing(listings: CompanyListingSnapshot[]): CompanyListingSnapshot | null {
  const active = listings.filter((l) => l.isActive);
  const stale = active.filter((l) => l.applicantCount === 0 && daysAgo(l.createdAt, 14));
  if (stale.length === 0) return null;
  return stale.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
}

export function findTopListing(listings: CompanyListingSnapshot[]): CompanyListingSnapshot | null {
  if (listings.length === 0) return null;
  return [...listings].sort((a, b) => b.applicantCount - a.applicantCount)[0];
}
