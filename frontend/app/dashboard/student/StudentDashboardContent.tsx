"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ApplicationTable from "@/components/applications/ApplicationTable";
import type { Application } from "@/lib/types";

export default function StudentDashboardContent() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setApplications([]);
        setLoading(false);
        return;
      }

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
  const recent = applications.slice(0, 5);

  if (loading) return <p className="text-gray-600">Loading…</p>;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total applications</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-gray-900">{pending}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Accepted</p>
          <p className="text-2xl font-bold text-gray-900">{accepted}</p>
        </div>
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Recent applications</h2>
        <p className="text-sm text-gray-600">Last 5 applications</p>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No applications yet.</p>
        ) : (
          <div className="mt-4">
            <ApplicationTable applications={recent} showViewAction />
          </div>
        )}
      </section>
    </>
  );
}
