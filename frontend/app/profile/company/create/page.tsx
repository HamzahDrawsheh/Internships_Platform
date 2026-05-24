"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileFormSkeleton } from "@/components/loading";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { normalizeIndustryForStorage } from "@/lib/companies/industry";
import { createClient } from "@/lib/supabase/client";

export default function CreateCompanyProfilePage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const guard = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("create company profile user error:", userError);
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
        console.error("create company profile role error:", profileError);
        setError("Unable to verify your role.");
        setLoading(false);
        return;
      }
      if (profile?.role !== "company") {
        router.replace("/dashboard");
        return;
      }

      const { data: existingCompany, error: existingCompanyError } = await supabase
        .from("companies")
        .select("id, company_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingCompanyError) {
        console.error("create company profile existing row error:", existingCompanyError);
        setError("Unable to load company profile.");
        setLoading(false);
        return;
      }

      if (existingCompany) {
        router.replace("/profile/company");
        return;
      }

      setCompanyName((user.user_metadata?.full_name as string) ?? "");
      setLoading(false);
    };

    guard();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("create company profile submit user error:", userError);
      setError("Unable to verify your account.");
      setSaving(false);
      return;
    }
    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const { error: insertError } = await supabase.from("companies").insert({
      user_id: user.id,
      company_name: companyName.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      industry: normalizeIndustryForStorage(industry),
      website: website.trim() || null,
      contact_email: user.email ?? null,
    });

    if (insertError) {
      console.error("create company profile insert error:", insertError);
      setError("Failed to create company profile.");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/dashboard/company");
    router.refresh();
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-2xl">
        <PageHeader
          title="Create Company Profile"
          description="Complete your company profile to start posting internships."
        />
        {loading ? (
          <ProfileFormSkeleton />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
                {error}
              </div>
            )}
            <Card>
              <Input
                label="Company name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
              />
              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Amman, Jordan"
                className="mt-4"
              />
              <Input
                label="Industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Technology"
                className="mt-4"
              />
              <Input
                label="Website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="mt-4"
              />
              <Textarea
                label="Description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-4"
                placeholder="Tell students about your company"
              />
            </Card>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Save company profile"}
            </Button>
          </form>
        )}
      </Container>
    </main>
  );
}
