"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReportSkillCard } from "@/components/student/ReportSkillCard";
import { ProfileSectionCard } from "@/components/profile/StudentProfileUi";
import {
  groupSkillsByCategory,
  type ReportSkillCategory,
  type StudentReportSkillRow,
} from "@/lib/ai/task-to-skill";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";

const CATEGORY_ORDER: ReportSkillCategory[] = ["technical", "soft", "tool", "domain"];

export function VerifiedTrainingSkills() {
  const { t } = useI18n();
  const [skills, setSkills] = useState<StudentReportSkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
    if (!student?.id) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("student_report_skills")
      .select("*")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(t("taskToSkill.errorLoadVerified"));
      setLoading(false);
      return;
    }

    setSkills((data ?? []) as StudentReportSkillRow[]);
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

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

  const verifiedIcon = (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );

  if (loading) {
    return (
      <ProfileSectionCard title={t("taskToSkill.verifiedTitle")} accent="violet" icon={verifiedIcon}>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("taskToSkill.loadingVerified")}</p>
      </ProfileSectionCard>
    );
  }

  if (skills.length === 0) {
    return null;
  }

  return (
    <ProfileSectionCard title={t("taskToSkill.verifiedTitle")} accent="violet" icon={verifiedIcon}>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{t("taskToSkill.verifiedHint")}</p>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat];
          if (!items.length) return null;
          return (
            <div key={cat}>
              <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{categoryTitle(cat)}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((skill) => (
                  <div key={skill.id} className="space-y-1">
                    <ReportSkillCard
                      skill={skill}
                      busy={busyId === skill.id}
                      onAddToCv={handleAddToCv}
                      onRemove={handleRemove}
                    />
                    <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
                      {t("taskToSkill.sourceReport")} · {t("taskToSkill.keepAsEvidence")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ProfileSectionCard>
  );
}
