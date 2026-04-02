"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Application } from "@/lib/types";

export default function StudentDashboardContent() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Student");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setUserName("Student");
        setApplications([]);
        setLoading(false);
        return;
      }

      setUserId(user.id);
      const fallbackName = user.email?.split("@")[0] || "Student";
      const metadataName =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
        fallbackName;
      setUserName(metadataName);

      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!student) {
        setApplications([]);
        setLoading(false);
        return;
      }

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
      setLoading(false);
    };

    load();
  }, []);

  const total = applications.length;
  const pending = applications.filter((a) => a.status === "pending").length;
  const accepted = applications.filter((a) => a.status === "accepted").length;
  const rejected = applications.filter((a) => a.status === "rejected").length;
  const recent = applications.slice(0, 5);

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

  const handleTestRoleHack = async () => {
    if (!userId) {
      console.warn("[Test Role Hack] No authenticated user found.");
      return;
    }

    const supabase = createClient();
    const result = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userId)
      .select();

    console.log("[Test Role Hack] update profiles role=admin result:", result);
  };

  const handleTestNormalUpdate = async () => {
    if (!userId) {
      console.warn("[Test Normal Profile Update] No authenticated user found.");
      return;
    }

    const supabase = createClient();
    const result = await supabase
      .from("profiles")
      .update({ full_name: "toleen" })
      .eq("id", userId)
      .select();

    console.log("[Test Normal Profile Update] result:", result);
  };

  return (
    <div className="space-y-8">
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
            <Link
              href="/internships"
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            >
              Browse Internships
            </Link>
            <Link
              href="/profile/student"
              className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300 dark:focus-visible:ring-offset-gray-900"
            >
              Update Profile
            </Link>
            <button
              type="button"
              onClick={handleTestRoleHack}
              className="inline-flex items-center rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-all duration-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 dark:focus-visible:ring-offset-gray-900"
            >
              Test Role Hack
            </button>
            <button
              type="button"
              onClick={handleTestNormalUpdate}
              className="inline-flex items-center rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all duration-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 dark:focus-visible:ring-offset-gray-900"
            >
              Test Normal Update
            </button>
          </div>
        </div>
      </section>

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
