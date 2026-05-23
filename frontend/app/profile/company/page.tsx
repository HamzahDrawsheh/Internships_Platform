"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileFormSkeleton } from "@/components/loading";
import { Input, Textarea, Button, Card, Table } from "@/components/ui";
import { formatIndustryLabel, normalizeIndustryForStorage } from "@/lib/companies/industry";
import { createClient } from "@/lib/supabase/client";
import { CompanyLogo } from "@/components/companies/CompanyLogo";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

export default function CompanyProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [ratings, setRatings] = useState<{ id: string; rating: number; feedback: string | null; created_at: string }[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMessage, setLogoMessage] = useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

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
        setError(t("profile.company.errors.loadAccount"));
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
        setError(t("profile.company.errors.verifyRole"));
        setLoading(false);
        return;
      }
      if (profile?.role !== "company") {
        router.replace("/dashboard");
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id, company_name, description, location, industry, website, logo_url")
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
      setCompanyLogoUrl(typeof company.logo_url === "string" && company.logo_url.trim() ? company.logo_url.trim() : null);

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

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const uploadLogoFile = async (file: File, exitEditModeOnSuccess = false): Promise<boolean> => {
    setLogoMessage(null);
    setLogoUploadError(null);
    setLogoUploading(true);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/company/logo", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as { logoUrl?: string; error?: string } | null;

      if (!response.ok) {
        setLogoUploadError(payload?.error ?? t("profile.company.errors.logoFailed"));
        return false;
      }

      const nextUrl = typeof payload?.logoUrl === "string" ? payload.logoUrl.trim() : "";
      if (!nextUrl) {
        setLogoUploadError(t("profile.company.errors.logoNoUrl"));
        return false;
      }

      setCompanyLogoUrl(nextUrl);
      setLogoFile(null);
      if (logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
      setLogoPreviewUrl(null);
      setLogoMessage(t("profile.company.logoSuccess"));
      if (exitEditModeOnSuccess) {
        setEditMode(false);
      }
      return true;
    } catch (uploadError) {
      console.error("company logo upload error:", uploadError);
      setLogoUploadError(t("profile.company.errors.logoRetry"));
      return false;
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoFileSelected = (file: File | null) => {
    if (logoPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFile(file);
    setLogoMessage(null);
    setLogoUploadError(null);

    if (!file) {
      setLogoPreviewUrl(null);
      return;
    }

    setLogoPreviewUrl(URL.createObjectURL(file));
    void uploadLogoFile(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!companyId) {
      router.replace("/profile/company/create");
      return;
    }
    if (!name.trim()) {
      setError(t("profile.company.errors.nameRequired"));
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (logoFile) {
      const uploaded = await uploadLogoFile(logoFile);
      if (!uploaded) {
        setSaving(false);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("companies")
      .update({
        company_name: name.trim(),
        description: description.trim() || null,
        website: website.trim() || null,
        location: location.trim() || null,
        industry: normalizeIndustryForStorage(industry),
      })
      .eq("id", companyId);

    if (updateError) {
      console.error("company profile update error:", updateError);
      setError(t("profile.company.errors.saveFailed"));
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    setEditMode(false);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
      setLogoUploadError(t("profile.company.errors.chooseLogo"));
      return;
    }
    await uploadLogoFile(logoFile, true);
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-2xl">
        <PageHeader
          title={t("profile.company.title")}
          description={editMode ? t("profile.company.descEdit") : t("profile.company.descView")}
          action={
            editMode ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditMode(false);
                  setSaved(false);
                  setError(null);
                  setLogoMessage(null);
                  setLogoUploadError(null);
                }}
                disabled={loading || saving || logoUploading}
              >
                {t("common.cancel")}
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={() => setEditMode(true)} disabled={loading}>
                {t("common.updateProfile")}
              </Button>
            )
          }
        />
        {loading ? (
          <ProfileFormSkeleton />
        ) : (
          <>
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 transition-colors duration-300 dark:border dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300" role="status">{t("profile.company.changesSaved")}</div>
        )}
        {!editMode ? (
          <div className="space-y-6">
            <Card>
              <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">{t("profile.company.company")}</h2>
              <div className="mt-4 flex items-start gap-4">
                <CompanyLogo
                  name={name.trim() || "Company"}
                  logoUrl={companyLogoUrl}
                  previewUrl={logoPreviewUrl}
                  size="lg"
                />
                <div className="min-w-0 flex-1 text-sm">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.company.companyName")}</p>
                    <p className="mt-1 text-gray-900 dark:text-white">{name.trim() || "—"}</p>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.company.industry")}</p>
                      <p className="mt-1 text-gray-900 dark:text-white">{formatIndustryLabel(industry) || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.company.location")}</p>
                      <p className="mt-1 text-gray-900 dark:text-white">{location.trim() || "—"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.company.website")}</p>
                      <p className="mt-1 break-all text-gray-900 dark:text-white">{website.trim() || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t("profile.company.description")}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                  {description.trim() || "—"}
                </p>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
                  {t("profile.company.ratingsReceived")}
                </h2>
                <p className="text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                  {averageRating ? fmt(t("profile.company.averageRating"), { rating: averageRating.toFixed(1) }) : t("profile.company.noRatingsYet")}
                </p>
              </div>
              {ratings.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">
                  {t("profile.company.noRatingsSubmitted")}
                </p>
              ) : (
                <Table headers={[t("profile.company.colRating"), t("profile.company.colFeedback"), t("profile.company.colDate")]} className="mt-4">
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
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <Card>
              <Input label={t("profile.company.companyName")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("profile.company.phCompanyName")} />
              <Input label={t("profile.company.location")} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("profile.company.phLocation")} className="mt-4" />
              <Input label={t("profile.company.industry")} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder={t("profile.company.phIndustry")} className="mt-4" />
              <Input label={t("profile.company.website")} type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder={t("profile.company.phWebsite")} className="mt-4" />
              <Textarea label={t("profile.company.description")} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-4" placeholder={t("profile.company.phDescription")} />
            </Card>
            <Card>
              <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">{t("profile.company.companyLogo")}</h2>
              <p className="mt-1 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">
                {t("profile.company.logoDesc")}
              </p>
              {logoMessage && (
                <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800 transition-colors duration-300 dark:border dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300" role="status">
                  {logoMessage}
                </div>
              )}
              {logoUploadError && (
                <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800 transition-colors duration-300 dark:border dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
                  {logoUploadError}
                </div>
              )}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    disabled={logoUploading || saving}
                    className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 transition-colors duration-300 file:mr-4 file:rounded file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-white dark:hover:file:bg-slate-600"
                    aria-label={t("profile.company.uploadLogoAria")}
                    onChange={(e) => handleLogoFileSelected(e.target.files?.[0] ?? null)}
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <CompanyLogo
                      name={name.trim() || "Company"}
                      logoUrl={companyLogoUrl}
                      previewUrl={logoPreviewUrl}
                      size="md"
                    />
                    <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">
                      {logoUploading
                        ? t("profile.company.logoUploading")
                        : companyLogoUrl || logoPreviewUrl
                          ? t("profile.company.logoPreview")
                          : t("profile.company.logoNone")}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={logoUploading || saving || !logoFile}
                  onClick={() => void handleLogoUpload()}
                >
                  {logoUploading ? t("profile.student.uploading") : t("profile.company.reUpload")}
                </Button>
              </div>
            </Card>
            <Button type="submit" variant="primary" disabled={saving || loading || logoUploading}>
              {saving ? t("profile.student.saving") : t("profile.student.saveChanges")}
            </Button>
          </form>
        )}
          </>
        )}
      </Container>
    </main>
  );
}
