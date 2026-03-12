"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Table from "@/components/common/Table";
import Badge from "@/components/common/Badge";
import EmptyState from "@/components/common/EmptyState";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  active: "success",
  inactive: "default",
};

type ListingRow = {
  id: string;
  company_id: string;
  title: string;
  status: string;
  created_at?: string;
  applicants_count?: number;
};

export default function CompanyInternshipsList() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setListings([]);
        setLoading(false);
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) {
        setListings([]);
        setLoading(false);
        return;
      }

      const { data: positions, error } = await supabase
        .from("internship_positions")
        .select("id, company_id, title, is_active, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (error || !positions?.length) {
        setListings([]);
        setLoading(false);
        return;
      }

      const positionIds = positions.map((p) => p.id);
      const { data: applications } = await supabase
        .from("applications")
        .select("id, position_id")
        .in("position_id", positionIds);

      const countByPositionId = new Map<string, number>();
      (applications ?? []).forEach((app) => {
        countByPositionId.set(app.position_id, (countByPositionId.get(app.position_id) ?? 0) + 1);
      });

      const withCount: ListingRow[] = positions.map((p) => ({
        id: p.id,
        company_id: p.company_id,
        title: p.title,
        status: p.is_active ? "active" : "inactive",
        created_at: p.created_at,
        applicants_count: countByPositionId.get(p.id) ?? 0,
      }));

      setListings(withCount);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-gray-600">Loading…</p>;
  if (listings.length === 0) {
    return (
      <EmptyState
        title="No listings yet"
        description="Create your first internship to start receiving applications."
        actionLabel="Create internship"
        actionHref="/company/internships/new"
      />
    );
  }

  return (
    <Table headers={["Title", "Status", "Posted", "Applicants", "Actions"]}>
      {listings.map((i) => (
        <tr key={i.id} className="hover:bg-gray-50">
          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{i.title}</td>
          <td className="whitespace-nowrap px-4 py-3">
            <Badge variant={statusVariant[i.status] ?? "default"}>{i.status}</Badge>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{i.created_at ? new Date(i.created_at).toLocaleDateString() : "—"}</td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{i.applicants_count ?? 0}</td>
          <td className="whitespace-nowrap px-4 py-3 text-sm">
            <span className="flex flex-wrap gap-2">
              <Link href={`/company/internships/${i.id}/edit`} className="text-gray-600 hover:text-gray-900">Edit</Link>
              <span className="text-gray-300">|</span>
              <button type="button" className="text-gray-600 hover:text-gray-900">Pause</button>
              <span className="text-gray-300">|</span>
              <button type="button" className="text-gray-600 hover:text-gray-900">Close</button>
              <span className="text-gray-300">|</span>
              <Link href={`/company/internships/${i.id}/applications`} className="font-medium text-gray-900 hover:underline">View Applicants</Link>
            </span>
          </td>
        </tr>
      ))}
    </Table>
  );
}
