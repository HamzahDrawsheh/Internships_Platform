"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, EmptyState, Table } from "@/components/ui";
import { logPostgrestError } from "@/lib/postgrest-error";
import { createClient } from "@/lib/supabase/client";

type RowStatus = "pending" | "accepted" | "rejected" | "completed";

type ReportRow = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  university: string;
  department: string;
  major: string;
  company_name: string;
  internship_title: string;
  applied_at: string;
  status: RowStatus;
};

const STATUS_FILTERS: { param: string | null; label: string }[] = [
  { param: null, label: "All" },
  { param: "pending", label: "Pending" },
  { param: "accepted", label: "Accepted" },
  { param: "rejected", label: "Rejected" },
  { param: "completed", label: "Completed" },
];

function parseStatusParam(raw: string | null): RowStatus | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase().trim();
  if (normalized === "pending" || normalized === "accepted" || normalized === "rejected" || normalized === "completed") {
    return normalized;
  }
  return null;
}

function ReportsExportPageContent() {
  const searchParams = useSearchParams();
  const statusFilter = parseStatusParam(searchParams.get("status"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
  };

  useEffect(() => {
    const supabase = createClient();

    const loadSupervisorApplications = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("supervisor reports getUser error:", userError);
        setError("Unable to load your account.");
        setLoading(false);
        return;
      }
      if (!user) {
        setError("Please login to access supervisor reports.");
        setLoading(false);
        return;
      }

      const { data: supervisor, error: supervisorError } = await supabase
        .from("supervisors")
        .select("id, department")
        .eq("user_id", user.id)
        .maybeSingle();
      if (supervisorError) {
        logPostgrestError("supervisor reports supervisor query error:", supervisorError);
        setError("Unable to load supervisor profile.");
        setLoading(false);
        return;
      }
      if (!supervisor?.department) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, user_id, university, department, major")
        .eq("department", supervisor.department);
      if (studentsError) {
        logPostgrestError("supervisor reports students query error:", studentsError);
        setError("Unable to load students in your department.");
        setLoading(false);
        return;
      }

      const safeStudents = (studentsData ?? []) as {
        id: string;
        user_id: string;
        university: string | null;
        department: string | null;
        major: string | null;
      }[];
      if (safeStudents.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(safeStudents.map((student) => student.id))];
      const { data: applicationsData, error: applicationsError } = await supabase
        .from("applications")
        .select(
          `
          id,
          student_id,
          position_id,
          applied_at,
          status,
          internship_positions (
            id,
            title,
            company_id
          )
        `
        )
        .in("student_id", studentIds)
        .order("applied_at", { ascending: false });
      if (applicationsError) {
        logPostgrestError("supervisor reports applications query error:", applicationsError);
        setError("Unable to load applications.");
        setLoading(false);
        return;
      }

      type PositionEmbed = { id: string; title: string; company_id: string };

      const normalizePositionEmbed = (
        raw: PositionEmbed | PositionEmbed[] | null | undefined
      ): PositionEmbed | null => {
        if (raw == null) return null;
        return Array.isArray(raw) ? raw[0] ?? null : raw;
      };

      const safeApplications = ((applicationsData ?? []) as unknown as Array<{
        id: string;
        student_id: string;
        position_id: string;
        applied_at: string;
        status: string;
        internship_positions: PositionEmbed | PositionEmbed[] | null;
      }>).map((row) => ({
        ...row,
        internship_positions: normalizePositionEmbed(row.internship_positions),
      }));

      const normalizeStatus = (value: string): RowStatus => {
        const v = value?.toLowerCase?.() ?? "";
        if (v === "pending" || v === "accepted" || v === "rejected" || v === "completed") return v;
        return "pending";
      };

      if (safeApplications.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(safeStudents.map((student) => student.user_id))];
      const { data: profilesData, error: profilesError } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[], error: null };
      if (profilesError) {
        logPostgrestError("supervisor reports profiles query error:", profilesError);
      }

      const positionsForCompanies = safeApplications
        .map((application) => application.internship_positions)
        .filter((position): position is { id: string; title: string; company_id: string } => Boolean(position));

      const companyIds = [...new Set(positionsForCompanies.map((position) => position.company_id))];
      const { data: companiesData, error: companiesError } = companyIds.length
        ? await supabase.from("companies").select("id, company_name").in("id", companyIds)
        : { data: [] as { id: string; company_name: string | null }[], error: null };
      if (companiesError) {
        logPostgrestError("supervisor reports companies query error:", companiesError);
      }

      const studentById = new Map(safeStudents.map((student) => [student.id, student]));
      const profileByUserId = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));
      const companyById = new Map((companiesData ?? []).map((company) => [company.id, company]));

      setRows(
        safeApplications.map((application) => {
          const student = studentById.get(application.student_id);
          const profile = student ? profileByUserId.get(student.user_id) : null;
          const position = application.internship_positions;
          const company = position ? companyById.get(position.company_id) : null;
          return {
            id: application.id,
            student_id: application.student_id,
            student_name: profile?.full_name?.trim() || "—",
            student_email: profile?.email ?? "—",
            university: student?.university ?? "—",
            department: student?.department ?? "—",
            major: student?.major ?? "—",
            company_name: company?.company_name ?? "—",
            internship_title: position?.title ?? "—",
            applied_at: application.applied_at,
            status: normalizeStatus(application.status),
          };
        })
      );

      setLoading(false);
    };

    loadSupervisorApplications();
  }, []);

  const filteredRows = useMemo(() => {
    if (!statusFilter) return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const basePath = "/supervisor/reports";

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader
          title="Applications Monitoring"
          description="Internship applications from students in your academic department."
        />
        {!loading && !error && rows.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Filter</span>
            {STATUS_FILTERS.map(({ param, label }) => {
              const active = param === null ? statusFilter === null : statusFilter === param;
              const href = param === null ? basePath : `${basePath}?status=${param}`;
              return (
                <Link
                  key={label}
                  href={href}
                  scroll={false}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-purple-600 text-white shadow-sm dark:bg-purple-500"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ) : null}
        {statusFilter && !loading && !error ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-slate-400">
            Showing <span className="font-semibold capitalize">{statusFilter}</span> only
            {filteredRows.length !== rows.length ? ` (${filteredRows.length} of ${rows.length})` : null}.
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading applications...</p>
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? "No applications to monitor yet" : "No matching applications"}
            description={
              rows.length === 0
                ? "Students in your department do not have any internship applications yet."
                : `No applications with status “${statusFilter}”. Try another filter or view all.`
            }
            {...(rows.length > 0 && statusFilter
              ? {
                  actionLabel: "Show all",
                  actionHref: basePath,
                }
              : {})}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <Table
              headers={["Student", "Email", "University", "Department", "Major", "Company", "Internship", "Applied", "Status", "Actions"]}
              className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
            >
              {filteredRows.map((row) => (
                <tr key={row.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">{row.student_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{row.student_email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{row.university}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{row.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{row.major}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{row.company_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">{row.internship_title}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                    {formatDate(row.applied_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600 transition-colors duration-300 dark:text-slate-400">{row.status}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/supervisor/students/${row.student_id}`}>
                      <Button variant="secondary">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Container>
    </main>
  );
}

export default function ReportsExportPage() {
  return (
    <Suspense
      fallback={
        <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
          <Container>
            <PageHeader title="Applications Monitoring" description="Loading…" />
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading applications...</p>
          </Container>
        </main>
      }
    >
      <ReportsExportPageContent />
    </Suspense>
  );
}
