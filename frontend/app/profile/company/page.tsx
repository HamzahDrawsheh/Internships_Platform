"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Textarea, Button, Card, Table } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function CompanyProfilePage() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);
  const [ratings, setRatings] = useState<{ id: string; rating: number; feedback: string | null; created_at: string }[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const loadRatings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!company) return;

      const { data: rows } = await supabase
        .from("ratings")
        .select("id, rating, feedback, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const safeRows = rows ?? [];
      setRatings(safeRows);
      if (safeRows.length > 0) {
        const total = safeRows.reduce((sum, r) => sum + Number(r.rating), 0);
        setAverageRating(total / safeRows.length);
      } else {
        setAverageRating(null);
      }
    };

    loadRatings();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
  };

  return (
    <main className="py-8">
      <Container className="max-w-2xl">
        <PageHeader title="Company Profile" description="Company name, industry, website, description, and logo." />
        {saved && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800" role="status">Changes saved.</div>
        )}
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <Input label="Company name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" />
            <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" className="mt-4" />
            <Input label="Website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="mt-4" />
            <Textarea label="Description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-4" placeholder="Company description" />
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-gray-900">Logo upload</h2>
            <p className="mt-1 text-sm text-gray-500">Upload logic will be connected with storage later.</p>
            <div className="mt-4">
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                aria-label="Upload company logo"
                onChange={() => {}}
              />
              <p className="mt-2 text-sm text-gray-500">No file selected.</p>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Ratings received</h2>
              <p className="text-sm text-gray-600">
                {averageRating ? `Average ${averageRating.toFixed(1)} / 5` : "No ratings yet"}
              </p>
            </div>
            {ratings.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No student ratings submitted yet.</p>
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
          </Card>
          <Button type="submit" variant="primary">Save changes</Button>
        </form>
      </Container>
    </main>
  );
}
