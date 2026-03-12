"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
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
    Promise.all([
      api.get<{ id: string }>("/auth/me").catch(() => null),
      api.get<{ data: ListingRow[] }>("/internships").catch(() => ({ data: [] })),
    ]).then(([me, internshipsRes]) => {
      const userId = me?.id;
      const all = internshipsRes?.data ?? [];
      const mine = userId ? all.filter((i) => i.company_id === userId) : [];
      if (mine.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }
      Promise.all(
        mine.map((i) => api.get<{ data: unknown[] }>(`/internships/${i.id}/applications`).then((r) => (r.data ?? []).length).catch(() => 0))
      ).then((counts) => {
        const withCount: ListingRow[] = mine.map((i, idx) => ({
          id: i.id,
          company_id: i.company_id,
          title: i.title,
          status: i.status,
          deadline: i.deadline ?? null,
          created_at: i.created_at,
          applicants_count: counts[idx] ?? 0,
        }));
        setListings(withCount);
      }).finally(() => setLoading(false));
    }).catch(() => {
      setListings([]);
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
