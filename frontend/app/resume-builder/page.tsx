"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileFormSkeleton } from "@/components/loading";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

const CV_BUCKET = "student-cvs";

function bioFromStudentPreferences(raw: string | null): string {
  if (!raw?.trim()) return "";
  try {
    const p = JSON.parse(raw) as { bio?: string };
    if (typeof p.bio === "string" && p.bio.trim()) return p.bio.trim();
    return "";
  } catch {
    return raw.trim();
  }
}

const DOWNLOAD_CV_FILENAME = "internconnect-cv.pdf";

const MAX_EDUCATION_CHARS = 2200;
const MAX_PROJECT_BODY_CHARS = 900;
const MAX_COURSES_SNIPPET = 600;

export type CvPdfFields = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  summary: string;
  university: string;
  major: string;
  education: string;
  skills: string;
  experience: string;
  projects: string;
  linkedin: string;
  githubPortfolio: string;
};

export type AiCvSuggestion = {
  summary: string;
  skills: string;
  experience: string;
  projects: string;
};

function trimMax(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Dedupe comma/semicolon/newline-separated skills (case-insensitive). */
function normalizeSkillsList(raw: string): string {
  const parts = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out.join(", ");
}

function extractGpa(text: string): string | null {
  const m = text.match(/GPA\s*[:.]?\s*([\d.]+)/i);
  return m?.[1]?.trim() ?? null;
}

/** Shorten a "Courses: ..." segment if present. */
function clipCoursesLine(text: string): string {
  const idx = text.search(/courses\s*:/i);
  if (idx === -1) return text;
  const head = text.slice(0, idx);
  const tailStart = text.indexOf(":", idx) + 1;
  const tail = text.slice(tailStart).trim();
  const clipped = tail.length > MAX_COURSES_SNIPPET ? `${tail.slice(0, MAX_COURSES_SNIPPET)}…` : tail;
  return `${head}${text.slice(idx, tailStart)} ${clipped}`;
}

/** Drop lines already summarized above (University — Major, GPA). */
function stripStructuredEducationLines(raw: string): string {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (/^gpa\s*:/i.test(l)) return false;
      if (/^university\s*:/i.test(l)) return false;
      if (/^major\s*:/i.test(l)) return false;
      if (/^department\s*:/i.test(l)) return false;
      return true;
    })
    .join("\n")
    .trim();
}

function experienceToBullets(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((l) => l.replace(/^[\s•\-*–]+/, "").trim())
    .filter(Boolean)
    .map((l) => trimMax(l, 500));
}

function parseProjectBlocks(raw: string): { title: string; body: string }[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const chunks = trimmed.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
  const blocks: { title: string; body: string }[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const title = trimMax(lines[0], 100);
    const body = trimMax(lines.slice(1).join("\n"), MAX_PROJECT_BODY_CHARS);
    blocks.push({ title, body: body || "" });
  }

  return blocks;
}

/**
 * ATS-friendly: real text layers (selectable), Helvetica, consistent margins — no rasterized DOM.
 */
function buildCvPdfFromPreview(f: CvPdfFields): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxW = pageW - 2 * margin;
  let y = margin;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, fontSize: number, weight: "normal" | "bold") => {
    doc.setFont("helvetica", weight);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW);
    const lineH = fontSize * 0.55;
    for (const line of lines) {
      ensureSpace(lineH + 1);
      doc.text(line, margin, y);
      y += lineH;
    }
  };

  const writeIndentedWrapped = (text: string, fontSize: number, indentMm: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW - indentMm);
    const lineH = fontSize * 0.55;
    for (const line of lines) {
      ensureSpace(lineH + 1);
      doc.text(line, margin + indentMm, y);
      y += lineH;
    }
  };

  const sectionGap = () => {
    y += 4;
  };

  // --- Header ---
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const displayName = trimMax(f.fullName.trim() || "Applicant", 80);
  ensureSpace(12);
  doc.text(displayName, margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const contactBits = [f.email.trim(), f.phone.trim(), f.city.trim()].filter(Boolean);
  if (contactBits.length) {
    writeWrapped(contactBits.join(" | "), 10, "normal");
  }
  const linkBits = [f.linkedin.trim(), f.githubPortfolio.trim()].filter(Boolean);
  if (linkBits.length) {
    writeWrapped(linkBits.join(" | "), 10, "normal");
  }

  sectionGap();

  const summaryTrim = f.summary.trim();
  if (summaryTrim) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    ensureSpace(8);
    doc.text("PROFESSIONAL SUMMARY", margin, y);
    y += 7;
    writeWrapped(trimMax(summaryTrim, 1200), 10, "normal");
    sectionGap();
  }

  // --- EDUCATION ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  ensureSpace(8);
  doc.text("EDUCATION", margin, y);
  y += 7;

  const uniLine = [f.university.trim(), f.major.trim()].filter(Boolean).join(" — ");
  if (uniLine) {
    writeWrapped(uniLine, 10, "bold");
  }

  const gpa = extractGpa(f.education);
  if (gpa) {
    writeWrapped(`GPA: ${gpa}`, 10, "normal");
  }

  let eduDetail = stripStructuredEducationLines(f.education.trim());
  eduDetail = clipCoursesLine(eduDetail);
  eduDetail = trimMax(eduDetail, MAX_EDUCATION_CHARS);
  if (eduDetail) {
    writeWrapped(eduDetail, 10, "normal");
  }

  sectionGap();

  // --- SKILLS ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  ensureSpace(8);
  doc.text("SKILLS", margin, y);
  y += 7;

  const skillsLine = normalizeSkillsList(f.skills);
  if (skillsLine) {
    writeWrapped(skillsLine, 10, "normal");
  }

  // --- EXPERIENCE ---
  const expTrimmed = f.experience.trim();
  if (expTrimmed) {
    sectionGap();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    ensureSpace(8);
    doc.text("EXPERIENCE", margin, y);
    y += 7;

    const bullets = experienceToBullets(expTrimmed);
    for (const b of bullets) {
      writeIndentedWrapped(`• ${b}`, 10, 4);
    }
  }

  // --- PROJECTS ---
  const projectBlocks = parseProjectBlocks(f.projects);
  if (projectBlocks.length) {
    sectionGap();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    ensureSpace(8);
    doc.text("PROJECTS", margin, y);
    y += 7;

    for (const block of projectBlocks) {
      writeWrapped(block.title, 10, "bold");
      if (block.body) {
        writeIndentedWrapped(block.body, 10, 4);
      }
      y += 2;
    }
  }

  return doc;
}

export default function ResumeBuilderPage() {
  const { t } = useI18n();
  const previewRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
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
      setUniversity(studentRow.university ?? "");
      setMajor(studentRow.major ?? "");

      const rawPrefs =
        typeof studentRow.preferences === "string"
          ? studentRow.preferences
          : studentRow.preferences != null
            ? JSON.stringify(studentRow.preferences)
            : null;
      const bio = bioFromStudentPreferences(rawPrefs);

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
        const mergedSkills = [baseSkills, tech, soft].filter(Boolean).join(", ");
        setSkills(mergedSkills);

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

        if (bio) setExperience(bio);
      } else {
        const eduLines = [
          studentRow.university && `University: ${studentRow.university}`,
          studentRow.major && `Major: ${studentRow.major}`,
          studentRow.department && `Department: ${studentRow.department}`,
        ].filter(Boolean);
        setEducation(eduLines.join("\n"));
        if (bio) setExperience(bio);
      }

      setLoading(false);
    };

    void load();
  }, [t]);

  const handleSaveCv = useCallback(async () => {
    setMessage(null);
    setSaveError(null);

    if (!studentId) {
      setSaveError(t("cvBuilder.errors.notLoaded"));
      return;
    }

    setSaving(true);
    try {
      const pdf = buildCvPdfFromPreview({
        fullName,
        email,
        phone,
        city,
        summary,
        university,
        major,
        education,
        skills,
        experience,
        projects,
        linkedin,
        githubPortfolio,
      });
      const blob = pdf.output("blob");
      const objectPath = `students/${studentId}/cv.pdf`;

      const supabase = createClient();
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

      setMessage(t("cvBuilder.cvSavedMessage"));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("cvBuilder.errors.pdfFailed"));
    }
    setSaving(false);
  }, [
    studentId,
    fullName,
    email,
    phone,
    city,
    summary,
    university,
    major,
    education,
    skills,
    experience,
    projects,
    linkedin,
    githubPortfolio,
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
  }, [fullName, university, major, skills, education, experience, projects, linkedin, githubPortfolio]);

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
      const pdf = buildCvPdfFromPreview({
        fullName,
        email,
        phone,
        city,
        summary,
        university,
        major,
        education,
        skills,
        experience,
        projects,
        linkedin,
        githubPortfolio,
      });
      pdf.save(DOWNLOAD_CV_FILENAME);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : t("cvBuilder.errors.pdfFailed"));
    }
    setDownloading(false);
  }, [
    fullName,
    email,
    phone,
    city,
    summary,
    university,
    major,
    education,
    skills,
    experience,
    projects,
    linkedin,
    githubPortfolio,
  ]);

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
              <div
                id="cv-preview"
                ref={previewRef}
                style={{
                  fontFamily: "system-ui, sans-serif",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  maxWidth: "210mm",
                  minHeight: "280mm",
                  marginLeft: "auto",
                  marginRight: "auto",
                  width: "100%",
                  padding: "32px",
                  boxSizing: "border-box",
                  boxShadow: "0 1px 2px rgb(0 0 0 / 0.06)",
                }}
              >
                <header style={{ borderBottom: "1px solid #e5e5e5", paddingBottom: "16px" }}>
                  <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em", color: "#000000", margin: 0 }}>
                    {fullName.trim() || t("cvBuilder.previewName")}
                  </h1>
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px 16px",
                      fontSize: "14px",
                      color: "#555555",
                    }}
                  >
                    {email.trim() && <span>{email.trim()}</span>}
                    {phone.trim() && <span>{phone.trim()}</span>}
                    {city.trim() && <span>{city.trim()}</span>}
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px 16px",
                      fontSize: "14px",
                      color: "rgb(91, 33, 182)",
                    }}
                  >
                    {linkedin.trim() && <span style={{ wordBreak: "break-all" }}>{linkedin.trim()}</span>}
                    {githubPortfolio.trim() && (
                      <span style={{ wordBreak: "break-all" }}>{githubPortfolio.trim()}</span>
                    )}
                  </div>
                </header>

                {summary.trim() && (
                  <section style={{ marginTop: "24px" }}>
                    <h2
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#666666",
                        margin: 0,
                      }}
                    >
                      {t("cvBuilder.professionalSummary")}
                    </h2>
                    <p style={{ marginTop: "8px", whiteSpace: "pre-wrap", fontSize: "14px", color: "#222222", lineHeight: 1.5 }}>
                      {summary.trim()}
                    </p>
                  </section>
                )}

                {(university.trim() || major.trim() || education.trim()) && (
                  <section style={{ marginTop: "24px" }}>
                    <h2
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#666666",
                        margin: 0,
                      }}
                    >
                      {t("cvBuilder.education")}
                    </h2>
                    {university.trim() && (
                      <p style={{ marginTop: "8px", fontSize: "14px", fontWeight: 600, color: "#111111" }}>
                        {university.trim()}
                      </p>
                    )}
                    {major.trim() && <p style={{ fontSize: "14px", color: "#333333", margin: "4px 0 0 0" }}>{major.trim()}</p>}
                    {education.trim() && (
                      <p style={{ marginTop: "8px", whiteSpace: "pre-wrap", fontSize: "14px", color: "#333333" }}>
                        {education.trim()}
                      </p>
                    )}
                  </section>
                )}

                {skills.trim() && (
                  <section style={{ marginTop: "24px" }}>
                    <h2
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#666666",
                        margin: 0,
                      }}
                    >
                      {t("cvBuilder.skills")}
                    </h2>
                    <p style={{ marginTop: "8px", whiteSpace: "pre-wrap", fontSize: "14px", color: "#222222" }}>
                      {skills.trim()}
                    </p>
                  </section>
                )}

                {experience.trim() && (
                  <section style={{ marginTop: "24px" }}>
                    <h2
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#666666",
                        margin: 0,
                      }}
                    >
                      {t("cvBuilder.experience")}
                    </h2>
                    <p style={{ marginTop: "8px", whiteSpace: "pre-wrap", fontSize: "14px", color: "#222222" }}>
                      {experience.trim()}
                    </p>
                  </section>
                )}

                {projects.trim() && (
                  <section style={{ marginTop: "24px" }}>
                    <h2
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#666666",
                        margin: 0,
                      }}
                    >
                      {t("cvBuilder.projects")}
                    </h2>
                    <p style={{ marginTop: "8px", whiteSpace: "pre-wrap", fontSize: "14px", color: "#222222" }}>
                      {projects.trim()}
                    </p>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
