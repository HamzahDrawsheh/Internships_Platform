"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Textarea, Button, Card, Table } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function CompanyProfilePage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [ratings, setRatings] = useState<{ id: string; rating: number; feedback: string | null; created_at: string }[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const loadCompany = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("company profile user error:", userError);
        setError("Unable to load your account.");
        setLoading(false);
        return;
      }
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) {
        console.error("company profile role error:", profileError);
        setError("Unable to verify your role.");
        setLoading(false);
        return;
      }
      if (profile?.role !== "company") {
        router.replace("/dashboard");
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id, company_name, description, location, industry, website")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!company) {
        router.replace("/profile/company/create");
        return;
      }

      setCompanyId(company.id);
      setName(company.company_name ?? "");
      setLocation(company.location ?? "");
      setIndustry(company.industry ?? "");
      setWebsite(company.website ?? "");
      setDescription(company.description ?? "");

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
      setLoading(false);
    };

    loadCompany();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!companyId) {
      router.replace("/profile/company/create");
      return;
    }
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        company_name: name.trim(),
        description: description.trim() || null,
        website: website.trim() || null,
        location: location.trim() || null,
        industry: industry.trim() || null,
      })
      .eq("id", companyId);

    if (updateError) {
      console.error("company profile update error:", updateError);
      setError("Failed to save company profile.");
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-2xl">
        <PageHeader title="Company Profile" description="Company name, location, website, description, and logo." />
        {loading && <p className="mb-4 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading profile...</p>}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 transition-colors duration-300 dark:border dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300" role="status">Changes saved.</div>
        )}
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <Input label="Company name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" />
            <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Amman, Jordan" className="mt-4" />
            <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" className="mt-4" />
            <Input label="Website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="mt-4" />
            <Textarea label="Description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-4" placeholder="Company description" />
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Logo upload</h2>
            <p className="mt-1 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Upload logic will be connected with storage later.</p>
            <div className="mt-4">
              <input
                type="file"
                accept="image/*"
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 transition-colors duration-300 file:mr-4 file:rounded file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-white dark:hover:file:bg-slate-600"
                aria-label="Upload company logo"
                onChange={() => {}}
              />
              <p className="mt-2 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">No file selected.</p>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Ratings received</h2>
              <p className="text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                {averageRating ? `Average ${averageRating.toFixed(1)} / 5` : "No ratings yet"}
              </p>
            </div>
            {ratings.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">No student ratings submitted yet.</p>
            ) : (
              <Table headers={["Rating", "Feedback", "Date"]} className="mt-4">
                {ratings.map((r) => (
                  <tr key={r.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 transition-colors duration-300 dark:text-white">{r.rating} / 5</td>
                    <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{r.feedback ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
          <Button type="submit" variant="primary" disabled={saving || loading}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Container>
    </main>
  );
}
