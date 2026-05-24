"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableListPageSkeleton } from "@/components/loading";
import { Button, EmptyState, Input, Table } from "@/components/ui";
import { logPostgrestError } from "@/lib/postgrest-error";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

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

const STATUS_FILTER_PARAMS: { param: string | null; key: string }[] = [
  { param: null, key: "all" },
  { param: "pending", key: "pending" },
  { param: "accepted", key: "accepted" },
  { param: "rejected", key: "rejected" },
  { param: "completed", key: "completed" },
];

function appStatusLabel(status: RowStatus, t: (key: string) => string): string {
  return t(`supervisor.reports.${status}`);
}

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
  const { t } = useI18n();
  const statusFilter = parseStatusParam(searchParams.get("status"));

  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [search, setSearch] = useState("");

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
  };

  useEffect(() => {
    const supabase = createClient();

    const loadSupervisorApplications = async () => {
      setLoading(true);
      setErrorKey(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("supervisor reports getUser error:", userError);
        setErrorKey("loadAccountError");
        setLoading(false);
        return;
      }
      if (!user) {
        setErrorKey("loginRequired");
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
        setErrorKey("loadProfileError");
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
        setErrorKey("loadStudentsError");
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
        setErrorKey("loadAppsError");
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

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredRows;
    return filteredRows.filter((row) => {
      return (
        row.student_name.toLowerCase().includes(q) ||
        row.student_email.toLowerCase().includes(q) ||
        row.university.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q) ||
        row.major.toLowerCase().includes(q) ||
        row.company_name.toLowerCase().includes(q) ||
        row.internship_title.toLowerCase().includes(q)
      );
    });
  }, [filteredRows, search]);

  const hasActiveSearch = search.trim().length > 0;

  const basePath = "/supervisor/reports";

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader title={t("supervisor.reports.title")} description={t("supervisor.reports.description")} />
        {!loading && !errorKey && rows.length > 0 ? (
          <>
            <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <Input
                label={t("supervisor.reports.searchLabel")}
                placeholder={t("supervisor.reports.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="flex w-full items-center text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:w-auto sm:pr-1">
                  {t("supervisor.reports.status")}
                </span>
                {STATUS_FILTER_PARAMS.map(({ param, key }) => {
                  const active = param === null ? statusFilter === null : statusFilter === param;
                  const href = param === null ? basePath : `${basePath}?status=${param}`;
                  return (
                    <Link
                      key={key}
                      href={href}
                      scroll={false}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-[#7C3AED] text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {t(`supervisor.reports.${key}`)}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                <p className="text-slate-600 dark:text-slate-400">
                  {fmt(t("supervisor.reports.showing"), { visible: visibleRows.length, total: rows.length })}
                  {statusFilter ? (
                    <> {fmt(t("supervisor.reports.statusOnly"), { status: appStatusLabel(statusFilter, t) })}</>
                  ) : null}
                </p>
                {hasActiveSearch ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
                  >
                    {t("supervisor.reports.clearSearch")}
                  </button>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
        {loading ? (
          <TableListPageSkeleton showWelcome={false} />
        ) : errorKey ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {t(`supervisor.reports.${errorKey}`)}
          </p>
        ) : visibleRows.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? t("supervisor.reports.noAppsTitle") : t("supervisor.reports.noMatchTitle")}
            description={
              rows.length === 0
                ? t("supervisor.reports.noAppsDesc")
                : hasActiveSearch
                  ? t("supervisor.reports.noMatchDescSearch")
                  : fmt(t("supervisor.reports.noMatchDescStatus"), {
                      status: statusFilter ? appStatusLabel(statusFilter, t) : "",
                    })
            }
            {...(rows.length > 0 && (statusFilter || hasActiveSearch)
              ? hasActiveSearch
                ? { actionLabel: t("supervisor.reports.clearSearchAction"), onAction: () => setSearch("") }
                : { actionLabel: t("supervisor.reports.showAll"), actionHref: basePath }
              : {})}
          />
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <Table
              headers={[
                t("supervisor.reports.colStudent"),
                t("supervisor.reports.colEmail"),
                t("supervisor.reports.colUniversity"),
                t("supervisor.reports.colDepartment"),
                t("supervisor.reports.colMajor"),
                t("supervisor.reports.colCompany"),
                t("supervisor.reports.colInternship"),
                t("supervisor.reports.colApplied"),
                t("supervisor.reports.colStatus"),
                t("supervisor.reports.colActions"),
              ]}
              className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
            >
              {visibleRows.map((row) => (
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
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                    {appStatusLabel(row.status, t)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/supervisor/students/${row.student_id}`}>
                      <Button variant="secondary">{t("supervisor.reports.view")}</Button>
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

function ReportsPageFallback() {
  const { t } = useI18n();
  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader title={t("supervisor.reports.title")} description={t("supervisor.reports.description")} />
        <TableListPageSkeleton showWelcome={false} />
      </Container>
    </main>
  );
}

export default function ReportsExportPage() {
  return (
    <Suspense fallback={<ReportsPageFallback />}>
      <ReportsExportPageContent />
    </Suspense>
  );
}
