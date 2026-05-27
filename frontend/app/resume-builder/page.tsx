"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildCvPdf } from "@/lib/cv/build-cv-pdf";
import { buildCvPreferencesPayload } from "@/lib/cv/student-cv-preferences";
import { persistStudentCvFields, parseCvStudentPreferences } from "@/lib/cv/persist-student-cv";
import type { AiCvSuggestion, CvPdfFields } from "@/lib/cv/types";
import { CvLivePreview } from "@/components/cv/CvLivePreview";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileFormSkeleton } from "@/components/loading";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { notifyStudentProfileUpdated } from "@/lib/dashboard/student-dashboard-sync";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

const CV_BUCKET = "student-cvs";

const DOWNLOAD_CV_FILENAME = "internconnect-cv.pdf";

export type { CvPdfFields, AiCvSuggestion } from "@/lib/cv/types";

export default function ResumeBuilderPage() {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [existingPreferences, setExistingPreferences] = useState<unknown>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [department, setDepartment] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [projects, setProjects] = useState("");
  const [experience, setExperience] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [githubPortfolio, setGithubPortfolio] = useState("");

  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [pendingAi, setPendingAi] = useState<AiCvSuggestion | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setForbidden(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setForbidden(t("cvBuilder.errors.signInStudent"));
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setForbidden(t("cvBuilder.errors.loadProfile"));
        setLoading(false);
        return;
      }

      if (profile?.role && profile.role !== "student") {
        setForbidden(t("cvBuilder.errors.studentsOnly"));
        setLoading(false);
        return;
      }

      setFullName(profile?.full_name?.trim() ?? "");
      setEmail(profile?.email?.trim() ?? "");

      const { data: studentRow, error: studentError } = await supabase
        .from("students")
        .select("id, university, department, major, skills, preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentError) {
        setForbidden(t("cvBuilder.errors.loadStudent"));
        setLoading(false);
        return;
      }

      if (!studentRow) {
        setForbidden(t("cvBuilder.errors.completeOnboarding"));
        setLoading(false);
        return;
      }

      setStudentId(studentRow.id);
      setUserId(user.id);
      setUniversity(studentRow.university ?? "");
      setMajor(studentRow.major ?? "");
      setDepartment(studentRow.department ?? "");
      setExistingPreferences(studentRow.preferences);

      const cvPrefs = parseCvStudentPreferences(studentRow.preferences);
      setSummary(cvPrefs.summary);
      setProjects(cvPrefs.projects);
      setLinkedin(cvPrefs.linkedin);
      setGithubPortfolio(cvPrefs.github);
      setPhone(cvPrefs.phone);

      const baseSkills = (studentRow.skills ?? "").trim();
      setSkills(baseSkills);

      const { data: extra } = await supabase
        .from("student_additional_info")
        .select(
          "gpa, technical_skills, soft_skills, taken_courses, preferred_location"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (extra) {
        setCity(extra.preferred_location?.trim() ?? "");
        const tech = (extra.technical_skills ?? []).join(", ");
        const soft = (extra.soft_skills ?? []).join(", ");
        if (baseSkills) {
          setSkills(baseSkills);
        } else {
          setSkills([tech, soft].filter(Boolean).join(", "));
        }

        const gpaStr = extra.gpa != null ? String(extra.gpa) : "";
        const courses = (extra.taken_courses ?? []).filter(Boolean).join(", ");
        const eduLines = [
          studentRow.university && `University: ${studentRow.university}`,
          studentRow.major && `Major: ${studentRow.major}`,
          studentRow.department && `Department: ${studentRow.department}`,
          gpaStr && `GPA: ${gpaStr}`,
          courses && `Courses: ${courses}`,
        ].filter(Boolean);
        setEducation(eduLines.join("\n"));

        if (cvPrefs.bio) setExperience(cvPrefs.bio);
      } else {
        const eduLines = [
          studentRow.university && `University: ${studentRow.university}`,
          studentRow.major && `Major: ${studentRow.major}`,
          studentRow.department && `Department: ${studentRow.department}`,
        ].filter(Boolean);
        setEducation(eduLines.join("\n"));
        if (cvPrefs.bio) setExperience(cvPrefs.bio);
      }

      setLoading(false);
    };

    void load();
  }, [t]);

  const cvFields = useMemo<CvPdfFields>(
    () => ({
      fullName,
      email,
      phone,
      city,
      summary,
      university,
      major,
      department,
      education,
      skills,
      experience,
      projects,
      linkedin,
      githubPortfolio,
    }),
    [
      fullName,
      email,
      phone,
      city,
      summary,
      university,
      major,
      department,
      education,
      skills,
      experience,
      projects,
      linkedin,
      githubPortfolio,
    ]
  );

  const handleSaveCv = useCallback(async () => {
    setMessage(null);
    setSaveError(null);

    if (!studentId || !userId) {
      setSaveError(t("cvBuilder.errors.notLoaded"));
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const persistResult = await persistStudentCvFields(
        supabase,
        userId,
        studentId,
        {
          fullName,
          phone,
          city,
          university,
          major,
          department,
          summary,
          skills,
          experience,
          projects,
          linkedin,
          githubPortfolio,
        },
        existingPreferences,
      );

      if (!persistResult.ok) {
        setSaveError(persistResult.error);
        setSaving(false);
        return;
      }

      const pdf = buildCvPdf(cvFields);
      const blob = pdf.output("blob");
      const objectPath = `students/${studentId}/cv.pdf`;

      const { error: uploadError } = await supabase.storage.from(CV_BUCKET).upload(objectPath, blob, {
        upsert: true,
        contentType: "application/pdf",
      });

      if (uploadError) {
        setSaveError(uploadError.message || t("cvBuilder.errors.uploadFailed"));
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("students")
        .update({ cv_path: objectPath, cv_url: null })
        .eq("id", studentId);

      if (updateError) {
        setSaveError(updateError.message || t("cvBuilder.errors.uploadProfileFailed"));
        setSaving(false);
        return;
      }

      const nextPrefsRaw = buildCvPreferencesPayload(existingPreferences, {
        experience,
        summary,
        projects,
        linkedin,
        githubPortfolio,
        phone,
      });
      setExistingPreferences(nextPrefsRaw ? JSON.parse(nextPrefsRaw) : null);

      void fetch("/api/embeddings/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ scope: "student" }),
      })
        .then(() => notifyStudentProfileUpdated())
        .catch(() => {});

      notifyStudentProfileUpdated();
      setMessage(t("cvBuilder.cvSavedMessage"));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("cvBuilder.errors.pdfFailed"));
    }
    setSaving(false);
  }, [
    studentId,
    userId,
    cvFields,
    existingPreferences,
    fullName,
    phone,
    city,
    university,
    major,
    department,
    summary,
    skills,
    experience,
    projects,
    linkedin,
    githubPortfolio,
    t,
  ]);

  const handleImproveWithAi = useCallback(async () => {
    setImproveError(null);
    setMessage(null);
    setImproving(true);
    try {
      const res = await fetch("/api/resume/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          university,
          major,
          skills,
          education,
          experience,
          projects,
          linkedin,
          github: githubPortfolio,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        summary?: string;
        skills?: string;
        experience?: string;
        projects?: string;
      };

      if (!res.ok) {
        if (data.error === "ai_not_configured") {
          setImproveError(t("cvBuilder.errors.aiNotConfigured"));
        } else {
          setImproveError(data.error === "forbidden" ? t("cvBuilder.errors.aiForbidden") : t("cvBuilder.errors.aiFailed"));
        }
        setImproving(false);
        return;
      }

      if (!data.ok) {
        setImproveError(t("cvBuilder.errors.aiEmpty"));
        setImproving(false);
        return;
      }

      setPendingAi({
        summary: data.summary ?? "",
        skills: data.skills ?? "",
        experience: data.experience ?? "",
        projects: data.projects ?? "",
      });
      setMessage(t("cvBuilder.reviewAiMessage"));
    } catch {
      setImproveError(t("cvBuilder.errors.aiNetwork"));
    }
    setImproving(false);
  }, [fullName, university, major, skills, education, experience, projects, linkedin, githubPortfolio, t]);

  const handleApplyAiSuggestions = useCallback(() => {
    if (!pendingAi) return;
    setSummary(pendingAi.summary);
    setSkills(pendingAi.skills);
    setExperience(pendingAi.experience);
    setProjects(pendingAi.projects);
    setPendingAi(null);
    setImproveError(null);
    setMessage(t("cvBuilder.aiAppliedMessage"));
  }, [pendingAi, t]);

  const handleDiscardAiSuggestions = useCallback(() => {
    setPendingAi(null);
    setImproveError(null);
  }, []);

  const handleDownloadCv = useCallback(async () => {
    setDownloadError(null);

    setDownloading(true);
    try {
      const pdf = buildCvPdf(cvFields);
      pdf.save(DOWNLOAD_CV_FILENAME);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : t("cvBuilder.errors.pdfFailed"));
    }
    setDownloading(false);
  }, [cvFields, t]);

  if (loading) {
    return (
      <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <Container className="max-w-6xl">
          <ProfileFormSkeleton />
        </Container>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <Container className="max-w-lg">
          <PageHeader title={t("cvBuilder.title")} description={t("cvBuilder.descShort")} />
          <Card className="mt-6">
            <p className="text-sm text-gray-700 dark:text-slate-300">{forbidden}</p>
          </Card>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-6xl">
        <PageHeader
          title={t("cvBuilder.title")}
          description={t("cvBuilder.desc")}
        />

        {message && (
          <div
            className="mt-4 rounded-md border border-green-500/30 bg-green-50 p-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300"
            role="status"
          >
            {message}
          </div>
        )}
        {saveError && (
          <div
            className="mt-4 rounded-md border border-red-500/30 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300"
            role="alert"
          >
            {saveError}
          </div>
        )}
        {downloadError && (
          <div
            className="mt-4 rounded-md border border-red-500/30 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300"
            role="alert"
          >
            {downloadError}
          </div>
        )}
        {improveError && (
          <div
            className="mt-4 rounded-md border border-red-500/30 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300"
            role="alert"
          >
            {improveError}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6">
            <Card>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("cvBuilder.contact")}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label={t("cvBuilder.fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <Input
                  label={t("cvBuilder.email")}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input label={t("cvBuilder.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input label={t("cvBuilder.city")} value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("cvBuilder.phCity")} />
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("cvBuilder.professionalSummary")}</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {t("cvBuilder.summaryHint")}
              </p>
              <Textarea
                className="mt-4"
                label={t("cvBuilder.summary")}
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t("cvBuilder.phSummary")}
              />
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("cvBuilder.education")}</h2>
              <div className="mt-4 grid gap-4">
                <Input label={t("cvBuilder.university")} value={university} onChange={(e) => setUniversity(e.target.value)} />
                <Input label={t("cvBuilder.major")} value={major} onChange={(e) => setMajor(e.target.value)} />
                <Input label={t("cvBuilder.department")} value={department} onChange={(e) => setDepartment(e.target.value)} />
                <Textarea
                  label={t("cvBuilder.educationDetail")}
                  rows={5}
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder={t("cvBuilder.phEducation")}
                />
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("cvBuilder.skillsExperience")}</h2>
              <div className="mt-4 grid gap-4">
                <Textarea
                  label={t("cvBuilder.skills")}
                  rows={3}
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder={t("cvBuilder.phSkills")}
                />
                <Textarea
                  label={t("cvBuilder.experience")}
                  rows={5}
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
                <Textarea label={t("cvBuilder.projects")} rows={5} value={projects} onChange={(e) => setProjects(e.target.value)} />
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("cvBuilder.links")}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  label={t("cvBuilder.linkedin")}
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder={t("cvBuilder.phLinkedin")}
                />
                <Input
                  label={t("cvBuilder.githubPortfolio")}
                  value={githubPortfolio}
                  onChange={(e) => setGithubPortfolio(e.target.value)}
                  placeholder={t("cvBuilder.phGithub")}
                />
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("cvBuilder.aiAssistant")}</h2>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                {t("cvBuilder.aiHint")}
              </p>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleImproveWithAi()}
                  disabled={saving || downloading || improving}
                >
                  {improving ? t("cvBuilder.working") : t("cvBuilder.improveWithAi")}
                </Button>
              </div>

              {pendingAi && (
                <div className="mt-6 space-y-4 border-t border-gray-200 pt-6 dark:border-slate-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t("cvBuilder.suggestedEdits")}</p>
                  <Textarea
                    label={t("cvBuilder.suggestedSummary")}
                    rows={3}
                    value={pendingAi.summary}
                    onChange={(e) => setPendingAi({ ...pendingAi, summary: e.target.value })}
                  />
                  <Textarea
                    label={t("cvBuilder.suggestedSkills")}
                    rows={3}
                    value={pendingAi.skills}
                    onChange={(e) => setPendingAi({ ...pendingAi, skills: e.target.value })}
                  />
                  <Textarea
                    label={t("cvBuilder.suggestedExperience")}
                    rows={6}
                    value={pendingAi.experience}
                    onChange={(e) => setPendingAi({ ...pendingAi, experience: e.target.value })}
                  />
                  <Textarea
                    label={t("cvBuilder.suggestedProjects")}
                    rows={6}
                    value={pendingAi.projects}
                    onChange={(e) => setPendingAi({ ...pendingAi, projects: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="primary" onClick={handleApplyAiSuggestions}>
                      {t("cvBuilder.applyAi")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleDiscardAiSuggestions}>
                      {t("cvBuilder.discard")}
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleDownloadCv()}
                disabled={saving || downloading || improving}
              >
                {downloading ? t("cvBuilder.preparingDownload") : t("cvBuilder.downloadCv")}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleSaveCv()}
                disabled={saving || downloading || improving}
              >
                {saving ? t("cvBuilder.saving") : t("cvBuilder.saveAsCv")}
              </Button>
            </div>
          </div>

          <div className="lg:sticky lg:top-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-500">
              {t("cvBuilder.livePreview")}
            </p>
            {/* Preview is visual-only; exported PDF is generated from form fields (ATS-friendly text PDF). */}
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-slate-700 dark:bg-slate-900">
              <CvLivePreview
                {...cvFields}
                previewNameFallback={t("cvBuilder.previewName")}
                sectionLabels={{
                  summary: t("cvBuilder.professionalSummary"),
                  education: t("cvBuilder.education"),
                  skills: t("cvBuilder.skills"),
                  experience: t("cvBuilder.experience"),
                  projects: t("cvBuilder.projects"),
                  coursework: t("cvBuilder.coursework"),
                }}
              />
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
