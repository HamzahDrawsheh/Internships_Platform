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

  if (loading) return <p className="text-gray-600">Loading…</p>;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active internships</p>
          <p className="text-2xl font-bold text-gray-900">{internshipCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total applications received</p>
          <p className="text-2xl font-bold text-gray-900">{applicationCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total listings</p>
          <p className="text-2xl font-bold text-gray-900">{internshipCount}</p>
        </div>
      </div>
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Company ratings</h2>
          <p className="text-sm text-gray-600">
            {averageRating ? `Average ${averageRating.toFixed(1)} / 5` : "No ratings yet"}
          </p>
        </div>
        {ratings.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No ratings submitted yet.</p>
        ) : (
          <Table headers={["Rating", "Feedback", "Date"]} className="mt-4">
            {ratings.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{r.rating} / 5</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.feedback ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Recent applicants</h2>
        {recentApplicants.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No applicants yet.</p>
        ) : (
          <Table headers={["Student", "Internship", "Applied", "Status"]} className="mt-4">
            {recentApplicants.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{a.student_name ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{a.internship_title ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{a.applied_at ? new Date(a.applied_at).toLocaleDateString() : "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600">{String(a.status).replace("_", " ")}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}
