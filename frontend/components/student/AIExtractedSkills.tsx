"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReportSkillCard } from "@/components/student/ReportSkillCard";
import {
  groupSkillsByCategory,
  type ReportSkillCategory,
  type StudentReportSkillRow,
} from "@/lib/ai/task-to-skill";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";

const SKILL_COLUMNS =
  "id, student_id, report_id, skill_name, skill_category, evidence_text, confidence_score, source, approved_by_student, added_to_cv, approved_by_supervisor, created_at";

type Props = {
  reportId: string;
  /** Run extraction once after fresh submission. */
  autoExtract?: boolean;
  /** Report is already submitted — auto-extract if no skills exist yet. */
  reportSubmitted?: boolean;
  readOnly?: boolean;
};

const CATEGORY_ORDER: ReportSkillCategory[] = ["technical", "soft", "tool", "domain"];

export function AIExtractedSkills({
  reportId,
  autoExtract = false,
  reportSubmitted = false,
  readOnly = false,
}: Props) {
  const { t, isArabic } = useI18n();
  const [skills, setSkills] = useState<StudentReportSkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emptyHint, setEmptyHint] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const autoRunStarted = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("AIExtractedSkills reportId:", reportId);
    }
  }, [reportId]);

  const loadSkills = useCallback(
    async (options?: { updateState?: boolean }): Promise<StudentReportSkillRow[]> => {
      if (!reportId) return [];

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("student_report_skills")
        .select(SKILL_COLUMNS)
        .eq("report_id", reportId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AIExtractedSkills] load skills:", fetchError.message);
        }
        return [];
      }

      const rows = (data ?? []) as StudentReportSkillRow[];
      if (process.env.NODE_ENV === "development") {
        console.log("Fetched existing report skills:", rows);
      }
      if (options?.updateState !== false) {
        setSkills(rows);
      }
      return rows;
    },
    [reportId]
  );

  const runExtraction = useCallback(
    async (reanalyze: boolean) => {
      if (!reportId) return;

      setExtracting(true);
      setError(null);
      setEmptyHint(null);
      setSuccess(null);

      if (process.env.NODE_ENV === "development") {
        console.log("Re-analyze clicked for reportId:", reportId, "reanalyze:", reanalyze);
      }

      try {
        const res = await fetch("/api/ai/task-to-skill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            reportId,
            locale: isArabic ? "ar" : "en",
            reanalyze,
          }),
        });

        const data = (await res.json()) as {
          success?: boolean;
          ok?: boolean;
          skills?: StudentReportSkillRow[];
          summary?: string;
          message?: string;
          error?: string;
        };

        if (process.env.NODE_ENV === "development") {
          console.log("Task-to-skill API response:", data);
        }

        const succeeded = data.success === true || data.ok === true;

        if (!res.ok || !succeeded) {
          const detail = typeof data.error === "string" ? data.error : t("taskToSkill.errorExtract");
          if (process.env.NODE_ENV === "development") {
            console.error("[AIExtractedSkills] extraction failed:", detail);
          }
          setError(detail);
          return;
        }

        const returned = data.skills ?? [];
        if (data.summary) setSummary(data.summary);

        const fromDb = await loadSkills({ updateState: false });
        const displaySkills = fromDb.length > 0 ? fromDb : returned;
        setSkills(displaySkills);

        if (displaySkills.length === 0) {
          setEmptyHint(
            data.message === "no_supported_skills"
              ? t("taskToSkill.emptyNoSupported")
              : t("taskToSkill.empty")
          );
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[AIExtractedSkills] extraction exception:", err);
        }
        setError(t("taskToSkill.errorExtract"));
      } finally {
        setExtracting(false);
      }
    },
    [reportId, isArabic, t, loadSkills]
  );

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      const existing = await loadSkills();
      if (!cancelled) setLoading(false);

      const shouldAutoRun =
        !readOnly &&
        !autoRunStarted.current &&
        existing.length === 0 &&
        (autoExtract || reportSubmitted);

      if (shouldAutoRun) {
        autoRunStarted.current = true;
        void runExtraction(false);
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [loadSkills, autoExtract, reportSubmitted, readOnly, runExtraction]);

  const grouped = useMemo(() => groupSkillsByCategory(skills), [skills]);

  const categoryTitle = (cat: ReportSkillCategory): string => {
    const map: Record<ReportSkillCategory, string> = {
      technical: t("taskToSkill.categoryTechnical"),
      soft: t("taskToSkill.categorySoft"),
      tool: t("taskToSkill.categoryTool"),
      domain: t("taskToSkill.categoryDomain"),
    };
    return map[cat];
  };

  const handleAddToCv = async (skillId: string) => {
    setBusyId(skillId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/student-skills/add-to-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ skillId }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setError(t("taskToSkill.errorAddToCv"));
        return;
      }
      setSuccess(t("taskToSkill.addedSuccess"));
      await loadSkills();
    } catch {
      setError(t("taskToSkill.errorAddToCv"));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (skillId: string) => {
    setBusyId(skillId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/student-report-skills/${skillId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setError(t("taskToSkill.errorRemove"));
        return;
      }
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
    } catch {
      setError(t("taskToSkill.errorRemove"));
    } finally {
      setBusyId(null);
    }
  };

  const showEmpty = !loading && !extracting && skills.length === 0;

  return (
    <section className="mt-8 rounded-2xl border border-violet-200/70 bg-white/80 p-5 shadow-sm dark:border-violet-500/30 dark:bg-slate-900/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("taskToSkill.extractedTitle")}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("taskToSkill.extractedSubtitle")}</p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => void runExtraction(true)}
            disabled={extracting || !reportId}
            className="text-sm font-medium text-violet-700 hover:underline disabled:opacity-50 dark:text-violet-300"
          >
            {extracting ? t("taskToSkill.analyzing") : t("taskToSkill.retryExtract")}
          </button>
        ) : null}
      </div>

      {(loading || extracting) && skills.length === 0 ? (
        <p className="mt-4 text-sm text-violet-700 dark:text-violet-200" role="status">
          {t("taskToSkill.analyzing")}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      {summary ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{summary}</p>
      ) : null}

      {showEmpty ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {emptyHint ?? t("taskToSkill.empty")}
        </p>
      ) : null}

      <div className="mt-5 space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat];
          if (!items.length) return null;
          return (
            <div key={cat}>
              <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{categoryTitle(cat)}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((skill) => (
                  <ReportSkillCard
                    key={skill.id}
                    skill={skill}
                    readOnly={readOnly}
                    busy={busyId === skill.id}
                    onAddToCv={readOnly ? undefined : handleAddToCv}
                    onRemove={readOnly ? undefined : handleRemove}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
