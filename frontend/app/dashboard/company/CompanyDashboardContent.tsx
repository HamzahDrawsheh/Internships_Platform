"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Table from "@/components/common/Table";

type Row = { id: string; status: string; applied_at: string; internship_title?: string; student_name?: string };
type RatingRow = { id: string; rating: number; feedback: string | null; created_at: string };

export default function CompanyDashboardContent() {
  const [internshipCount, setInternshipCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [recentApplicants, setRecentApplicants] = useState<Row[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) {
        setInternshipCount(0);
        setApplicationCount(0);
        setRecentApplicants([]);
        setRatings([]);
        setAverageRating(null);
        setLoading(false);
        return;
      }

      const { data: positions } = await supabase
        .from("internship_positions")
        .select("id, title")
        .eq("company_id", company.id);

      const positionIds = (positions ?? []).map((p) => p.id);
      setInternshipCount(positionIds.length);

      if (positionIds.length === 0) {
        setApplicationCount(0);
        setRecentApplicants([]);
        setLoading(false);
        return;
      }

      const { data: applicationRows } = await supabase
        .from("applications")
        .select("id, status, applied_at, student_id, position_id")
        .in("position_id", positionIds)
        .order("applied_at", { ascending: false });

      const allApplications = applicationRows ?? [];
      setApplicationCount(allApplications.length);

      const recent = allApplications.slice(0, 5);
      const studentsIds = [...new Set(recent.map((r) => r.student_id))];
      const { data: students, error: studentsError } = studentsIds.length
        ? await supabase.from("students").select("id, user_id").in("id", studentsIds)
        : { data: [] as { id: string; user_id: string }[], error: null };
      if (studentsError) {
        console.error("company dashboard students query error:", studentsError);
      }
      const studentUserByStudentId = new Map((students ?? []).map((s) => [s.id, s.user_id]));
      const profileUserIds = [...new Set((students ?? []).map((s) => s.user_id))];
      const { data: profiles, error: profilesError } = profileUserIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", profileUserIds)
        : { data: [] as { id: string; full_name: string | null }[], error: null };
      if (profilesError) {
        console.error("company dashboard profiles query error:", profilesError);
      }
      const profileNameByUserId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      const titleByPositionId = new Map((positions ?? []).map((p) => [p.id, p.title]));

      const rows: Row[] = recent.map((row) => {
        const profileId = studentUserByStudentId.get(row.student_id);
        return {
          id: row.id,
          status: row.status,
          applied_at: row.applied_at,
          internship_title: titleByPositionId.get(row.position_id) ?? "—",
          student_name: profileId ? profileNameByUserId.get(profileId) ?? "—" : "—",
        };
      });

      setRecentApplicants(rows);

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

      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="mt-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-4 h-8 w-14 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
        <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-3 h-4 w-56 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="animate-fade-up rounded-2xl bg-purple-100 p-6 text-purple-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-purple-500/10 dark:text-purple-300">
          <p className="text-sm font-medium">Active internships</p>
          <p className="mt-4 text-3xl font-bold">{internshipCount}</p>
        </article>
        <article className="animate-fade-up rounded-2xl bg-amber-100 p-6 text-amber-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-amber-500/10 dark:text-amber-300">
          <p className="text-sm font-medium">Total applications received</p>
          <p className="mt-4 text-3xl font-bold">{applicationCount}</p>
        </article>
        <article className="animate-fade-up rounded-2xl bg-emerald-100 p-6 text-emerald-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-emerald-500/10 dark:text-emerald-300">
          <p className="text-sm font-medium">Total listings</p>
          <p className="mt-4 text-3xl font-bold">{internshipCount}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Company ratings</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Feedback shared by students about their internship experience
            </p>
          </div>
          <p className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {averageRating ? `Average ${averageRating.toFixed(1)} / 5` : "No ratings yet"}
          </p>
        </div>
        {ratings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl dark:bg-purple-500/15">
              <span aria-hidden>⭐</span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">No ratings yet</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Ratings from students will appear here once submitted.
            </p>
          </div>
        ) : (
          <Table
            headers={["Rating", "Feedback", "Date"]}
            className="mt-5 rounded-2xl border-gray-200 shadow-sm dark:border-gray-700 [&_thead]:bg-gray-50 [&_tbody]:bg-white"
          >
            {ratings.map((r) => (
              <tr key={r.id} className="transition-colors duration-300 hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">{r.rating} / 5</td>
                <td className="px-4 py-4 text-sm text-gray-600">{r.feedback ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">{new Date(r.created_at).toLocaleDateString()}</td>
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
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl dark:bg-purple-500/15">
              <span aria-hidden>👥</span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">No applicants yet</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Applicants will appear here as soon as students apply to your internships.
            </p>
          </div>
        ) : (
          <Table headers={["Student", "Internship", "Applied", "Status"]} className="mt-5 rounded-2xl border-gray-200 shadow-sm dark:border-gray-700">
            {recentApplicants.map((a) => (
              <tr key={a.id} className="transition-colors duration-300 hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">{a.student_name ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">{a.internship_title ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">{a.applied_at ? new Date(a.applied_at).toLocaleDateString() : "—"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm capitalize">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      a.status === "accepted"
                        ? "bg-emerald-100 text-emerald-700"
                        : a.status === "rejected"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {String(a.status).replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
