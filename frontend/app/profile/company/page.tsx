"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { ProfileFormSkeleton } from "@/components/loading";
import { Input, Textarea, Button } from "@/components/ui";
import {
  CompanyProfileHero,
  CompanyRatingCard,
  computeCompanyProfileCompleteness,
} from "@/components/profile/CompanyProfileUi";
import { ProfileField, ProfileSectionCard } from "@/components/profile/StudentProfileUi";
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
  }, [router, t]);

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

  const industryLabel = formatIndustryLabel(industry);
  const hasLogo = Boolean(companyLogoUrl || logoPreviewUrl);

  const profileCompleteness = useMemo(
    () =>
      computeCompanyProfileCompleteness({
        name,
        location,
        industry,
        website,
        description,
        hasLogo,
      }),
    [name, location, industry, website, description, hasLogo]
  );

  const heroSubtitle = [location.trim(), industryLabel].filter(Boolean).join(" · ");

  const editAction = editMode ? (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
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
    </button>
  ) : (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 shadow-md transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => setEditMode(true)}
      disabled={loading}
    >
      {t("common.updateProfile")}
    </button>
  );

  const websiteTrimmed = website.trim();
  const websiteDisplay = websiteTrimmed ? (
    <a
      href={websiteTrimmed.startsWith("http") ? websiteTrimmed : `https://${websiteTrimmed}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-block break-all text-sm font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
    >
      {websiteTrimmed}
    </a>
  ) : (
    "—"
  );

  return (
    <main className="py-8 pb-10 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-3xl">
        {error && (
          <div
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}
        {saved && (
          <div
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            role="status"
          >
            {t("profile.company.changesSaved")}
          </div>
        )}

        {loading ? (
          <ProfileFormSkeleton />
        ) : (
          <>
            <CompanyProfileHero
              name={name}
              logoUrl={companyLogoUrl}
              previewUrl={editMode ? logoPreviewUrl : null}
              subtitle={heroSubtitle || undefined}
              badge={industryLabel || undefined}
              completeness={profileCompleteness}
              stats={[
                {
                  label: t("profile.company.statAvgRating"),
                  value: averageRating != null ? averageRating.toFixed(1) : "—",
                },
                {
                  label: t("profile.company.statRatings"),
                  value: ratings.length > 0 ? String(ratings.length) : "—",
                },
                {
                  label: t("profile.company.statLogo"),
                  value: hasLogo ? t("profile.company.logoUploaded") : t("profile.company.logoMissing"),
                },
              ]}
              action={editAction}
            />

            {!editMode && (
              <div
                className="mt-6 rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-4 py-4 text-sm text-violet-900 dark:border-violet-500/20 dark:from-violet-950/40 dark:via-slate-900 dark:to-fuchsia-950/20 dark:text-violet-100"
                role="note"
              >
                <p className="font-semibold">{t("profile.company.tipTitle")}</p>
                <p className="mt-1 text-violet-800/90 dark:text-violet-200/90">{t("profile.company.tipBody")}</p>
              </div>
            )}

            {editMode ? (
              <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">{t("profile.company.descEdit")}</p>
            ) : (
              <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">{t("profile.company.descView")}</p>
            )}

            {!editMode ? (
              <div className="mt-6 space-y-5">
                <ProfileSectionCard
                  title={t("profile.company.companyInfo")}
                  accent="violet"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ProfileField label={t("profile.company.companyName")} value={name} />
                    <ProfileField label={t("profile.company.industry")} value={industryLabel} />
                    <ProfileField label={t("profile.company.location")} value={location} />
                    <div className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("profile.company.website")}
                      </p>
                      {websiteDisplay}
                    </div>
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("profile.company.aboutCompany")}
                  accent="cyan"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <ProfileField label={t("profile.company.description")} value={description} />
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("profile.company.companyLogo")}
                  accent="amber"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <div
                    className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-4 py-6 sm:flex-row sm:items-center ${
                      hasLogo
                        ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                        : "border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40"
                    }`}
                  >
                    <CompanyLogo
                      name={name.trim() || "Company"}
                      logoUrl={companyLogoUrl}
                      size="xl"
                    />
                    <div className="text-center sm:text-start">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {hasLogo ? t("profile.company.logoPreview") : t("profile.company.logoNone")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("profile.company.logoDesc")}</p>
                    </div>
                  </div>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("profile.company.ratingsReceived")}
                  accent="fuchsia"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  }
                >
                  <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                    {averageRating
                      ? fmt(t("profile.company.averageRating"), { rating: averageRating.toFixed(1) })
                      : t("profile.company.noRatingsYet")}
                  </p>
                  {ratings.length === 0 ? (
                    <p className="rounded-xl bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                      {t("profile.company.noRatingsSubmitted")}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {ratings.map((r) => (
                        <CompanyRatingCard
                          key={r.id}
                          rating={Number(r.rating)}
                          feedback={r.feedback}
                          dateLabel={new Date(r.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        />
                      ))}
                    </div>
                  )}
                </ProfileSectionCard>
              </div>
            ) : (
              <form onSubmit={handleSave} className="mt-6 space-y-5">
                <ProfileSectionCard
                  title={t("profile.company.companyInfo")}
                  accent="violet"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label={t("profile.company.companyName")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("profile.company.phCompanyName")}
                    />
                    <Input
                      label={t("profile.company.industry")}
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder={t("profile.company.phIndustry")}
                    />
                    <Input
                      label={t("profile.company.location")}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={t("profile.company.phLocation")}
                    />
                    <Input
                      label={t("profile.company.website")}
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder={t("profile.company.phWebsite")}
                    />
                  </div>
                  <Textarea
                    label={t("profile.company.description")}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-4"
                    placeholder={t("profile.company.phDescription")}
                  />
                </ProfileSectionCard>

                <ProfileSectionCard
                  title={t("profile.company.companyLogo")}
                  accent="amber"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t("profile.company.logoDesc")}</p>
                  {logoMessage && (
                    <div
                      className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                      role="status"
                    >
                      {logoMessage}
                    </div>
                  )}
                  {logoUploadError && (
                    <div
                      className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                      role="alert"
                    >
                      {logoUploadError}
                    </div>
                  )}
                  <div className="mt-4 rounded-xl border-2 border-dashed border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                          disabled={logoUploading || saving}
                          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-violet-800 hover:file:bg-violet-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:file:bg-violet-500/20 dark:file:text-violet-200"
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
                          <p className="text-sm text-slate-600 dark:text-slate-400">
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
                        className="rounded-full"
                      >
                        {logoUploading ? t("profile.student.uploading") : t("profile.company.reUpload")}
                      </Button>
                    </div>
                  </div>
                </ProfileSectionCard>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving || loading || logoUploading}
                  className="w-full rounded-full py-3 sm:w-auto sm:px-8"
                >
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
