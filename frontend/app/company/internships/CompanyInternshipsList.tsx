"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Table from "@/components/common/Table";
import Badge from "@/components/common/Badge";
import EmptyState from "@/components/common/EmptyState";
const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  active: "success",
  draft: "default",
  paused: "warning",
  closed: "danger",
  pending: "warning",
};

type ListingRow = {
  id: string;
  company_id: string;
  title: string;
  status: string;
  deadline: string | null;
  created_at?: string;
  applicants_count?: number;
};

export default function CompanyInternshipsList() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setListings([]);
        setLoading(false);
        return;
      }
      supabase
        .from("internships")
        .select("id, company_id, title, status, deadline, created_at")
        .eq("company_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data: internships, error }) => {
          if (error || !internships?.length) {
            setListings([]);
            setLoading(false);
            return;
          }
          Promise.all(
            internships.map((i) =>
              supabase.from("applications").select("id", { count: "exact", head: true }).eq("internship_id", i.id)
            )
          ).then((counts) => {
            const withCount: ListingRow[] = internships.map((i, idx) => ({
              id: i.id,
              company_id: i.company_id,
              title: i.title,
              status: i.status,
              deadline: i.deadline ?? null,
              created_at: i.created_at,
              applicants_count: (counts[idx] as { count?: number })?.count ?? 0,
            }));
            setListings(withCount);
          }).then(() => setLoading(false), () => setLoading(false));
        });
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
    <Table headers={["Title", "Status", "Deadline", "Applicants", "Actions"]}>
      {listings.map((i) => (
        <tr key={i.id} className="hover:bg-gray-50">
          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{i.title}</td>
          <td className="whitespace-nowrap px-4 py-3">
            <Badge variant={statusVariant[i.status] ?? "default"}>{i.status}</Badge>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{i.deadline ? new Date(i.deadline).toLocaleDateString() : "—"}</td>
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
