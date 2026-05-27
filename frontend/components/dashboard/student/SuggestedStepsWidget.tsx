"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CyclicWidget } from "@/components/dashboard/CyclicWidget";
import { Button } from "@/components/ui";
import { openStudentAssistant } from "@/lib/ai/open-student-assistant";
import { buildStudentSuggestionSlides } from "@/lib/dashboard/student-career-hints";
import {
  fetchStudentProfileSnapshot,
  type StudentProfileSnapshot,
} from "@/lib/dashboard/load-student-profile-snapshot";
import { useDashboardDataRefresh } from "@/lib/dashboard/student-dashboard-sync";
import { useI18n } from "@/lib/i18n/context";

type Props = Partial<StudentProfileSnapshot>;

function slideKind(id: string): "step" | "career" | "tip" | "help" {
  if (id.startsWith("career-") || id === "skills-spotlight") return "career";
  if (id === "assistant") return "help";
  if (id === "profile" || id === "cv" || id === "browse" || id === "pending-apps") return "step";
  return "tip";
}

function buildLabels(t: (key: string) => string) {
  const w = (key: string) => t(`dashboard.student.widgets.${key}`);
  return {
    stepProfileTitle: t("dashboard.student.stepProfileTitle"),
    stepProfileDesc: t("dashboard.student.stepProfileDesc"),
    stepProfileCta: t("dashboard.student.stepProfileCtaTodo"),
    stepCvTitle: t("dashboard.student.stepCvTitle"),
    stepCvDesc: t("dashboard.student.stepCvDesc"),
    stepCvCta: t("dashboard.student.stepCvCtaTodo"),
    stepBrowseTitle: t("dashboard.student.stepBrowseTitle"),
    stepBrowseDesc: t("dashboard.student.stepBrowseDesc"),
    stepBrowseCta: t("dashboard.student.stepBrowseCtaTodo"),
    careerTitle: w("careerDirection"),
    careerBecause: w("careerBecause"),
    hintRefreshTitle: w("hintRefreshTitle"),
    hintRefreshBody: w("hintRefreshBody"),
    hintRefreshCta: w("hintRefreshCta"),
    assistantTitle: w("assistantTitle"),
    assistantBody: w("assistantBody"),
    assistantCta: w("assistantCta"),
    skillsSpotlightTitle: w("skillsSpotlightTitle"),
    skillsSpotlightBody: w("skillsSpotlightBody"),
    skillsSpotlightCta: w("skillsSpotlightCta"),
    pendingAppsTitle: w("pendingAppsTitle"),
    pendingAppsBody: w("pendingAppsBody"),
    pendingAppsCta: w("pendingAppsCta"),
    careerMlTitle: w("careerMlTitle"),
    careerMlReason1: w("careerMlReason1"),
    careerMlReasonPython: w("careerMlReasonPython"),
    careerMlReasonCoursework: w("careerMlReasonCoursework"),
    careerMlReasonDemand: w("careerMlReasonDemand"),
    careerFrontendTitle: w("careerFrontendTitle"),
    careerFrontendReason1: w("careerFrontendReason1"),
    careerFrontendReasonUi: w("careerFrontendReasonUi"),
    careerFrontendReasonStack: w("careerFrontendReasonStack"),
    careerFrontendReasonDemand: w("careerFrontendReasonDemand"),
    careerAnalystTitle: w("careerAnalystTitle"),
    careerAnalystReasonViz: w("careerAnalystReasonViz"),
    careerAnalystReasonData: w("careerAnalystReasonData"),
    careerAnalystReasonPython: w("careerAnalystReasonPython"),
    careerAnalystReasonStructured: w("careerAnalystReasonStructured"),
    careerAnalystReasonRoles: w("careerAnalystReasonRoles"),
    careerBackendTitle: w("careerBackendTitle"),
    careerBackendReason1: w("careerBackendReason1"),
    careerBackendReasonDb: w("careerBackendReasonDb"),
    careerBackendReasonFundamentals: w("careerBackendReasonFundamentals"),
    careerBackendReasonOptions: w("careerBackendReasonOptions"),
    careerMobileTitle: w("careerMobileTitle"),
    careerMobileReason1: w("careerMobileReason1"),
    careerMobileReason2: w("careerMobileReason2"),
    careerMobileReasonDemand: w("careerMobileReasonDemand"),
    careerDevopsTitle: w("careerDevopsTitle"),
    careerDevopsReason1: w("careerDevopsReason1"),
    careerDevopsReason2: w("careerDevopsReason2"),
    careerDevopsReasonCloud: w("careerDevopsReasonCloud"),
    careerSecurityTitle: w("careerSecurityTitle"),
    careerSecurityReason1: w("careerSecurityReason1"),
    careerSecurityReason2: w("careerSecurityReason2"),
    careerSecurityReasonDemand: w("careerSecurityReasonDemand"),
    careerPreferredReason1: w("careerPreferredReason1"),
    careerPreferredReasonSkills: w("careerPreferredReasonSkills"),
    careerPreferredReasonAddSkills: w("careerPreferredReasonAddSkills"),
    careerPreferredReasonWork: w("careerPreferredReasonWork"),
    careerPreferredReasonBrowse: w("careerPreferredReasonBrowse"),
    careerGeneralTitle: w("careerGeneralTitle"),
    careerGeneralReasonProfile: w("careerGeneralReasonProfile"),
    careerGeneralReasonCount: w("careerGeneralReasonCount"),
    careerGeneralReasonAddSkills: w("careerGeneralReasonAddSkills"),
    careerGeneralReasonBrowse: w("careerGeneralReasonBrowse"),
    careerReasonPref: w("careerReasonPref"),
  };
}

export function SuggestedStepsWidget(fallbackProps: Props = {}) {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<StudentProfileSnapshot | null>(null);
  const labels = useMemo(() => buildLabels(t), [t]);

  const load = useCallback(async () => {
    const fresh = await fetchStudentProfileSnapshot();
    if (fresh) setSnapshot(fresh);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useDashboardDataRefresh(load);

  const profile = useMemo(
    () =>
      snapshot ?? {
        hasDepartment: fallbackProps.hasDepartment ?? false,
        hasCv: fallbackProps.hasCv ?? false,
        hasApplied: fallbackProps.hasApplied ?? false,
        applicationCount: fallbackProps.applicationCount ?? 0,
        pendingApplications: fallbackProps.pendingApplications ?? 0,
        technicalSkills: fallbackProps.technicalSkills ?? [],
        softSkills: fallbackProps.softSkills ?? [],
        takenCourses: fallbackProps.takenCourses ?? [],
        customCourses: fallbackProps.customCourses ?? [],
        preferredField: fallbackProps.preferredField ?? null,
        preferredWorkType: fallbackProps.preferredWorkType ?? null,
        preferredLocation: fallbackProps.preferredLocation ?? null,
        major: fallbackProps.major ?? null,
        gpa: fallbackProps.gpa ?? null,
      },
    [fallbackProps, snapshot]
  );

  const suggestionSlides = useMemo(
    () => buildStudentSuggestionSlides({ ...profile, labels }),
    [profile, labels],
  );

  const slides = useMemo(
    () =>
      suggestionSlides.map((slide) => {
        const kind = slideKind(slide.id);
        const badge =
          kind === "career"
            ? t("dashboard.student.widgets.suggestedForYou")
            : kind === "step"
              ? t("dashboard.student.widgets.nextStep")
              : kind === "help"
                ? t("dashboard.student.widgets.needHelp")
                : t("dashboard.student.widgets.smartTip");

        return {
          id: slide.id,
          content: (
            <div className="flex h-full flex-col">
              <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                {badge}
              </span>
              <h4 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">{slide.title}</h4>
              <p
                className={`mt-2 text-sm leading-relaxed ${
                  kind === "career"
                    ? "text-lg font-semibold text-amber-900 dark:text-amber-100"
                    : "text-gray-700 dark:text-slate-300"
                }`}
              >
                {slide.body}
              </p>
              {slide.bullets?.length ? (
                <div className="mt-3 rounded-xl border border-amber-200/60 bg-white/70 p-3 dark:border-amber-500/20 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                    {t("dashboard.student.widgets.careerBecause")}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-gray-600 dark:text-slate-400">
                    {slide.bullets.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" aria-hidden />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {slide.action === "assistant" && slide.cta ? (
                <div className="mt-auto pt-4">
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-500/20 hover:from-teal-700 hover:to-cyan-700"
                    onClick={() => openStudentAssistant()}
                  >
                    {slide.cta}
                  </Button>
                </div>
              ) : slide.href && slide.cta ? (
                <Link href={slide.href} className="mt-auto pt-4">
                  <Button
                    variant="secondary"
                    className="w-full rounded-xl border-amber-200 bg-white hover:bg-amber-50 dark:border-amber-500/30 dark:bg-slate-900 dark:hover:bg-amber-500/10"
                  >
                    {slide.cta}
                  </Button>
                </Link>
              ) : null}
            </div>
          ),
        };
      }),
    [suggestionSlides, t],
  );

  return (
    <CyclicWidget
      title={t("dashboard.student.widgets.stepsTitle")}
      subtitle={t("dashboard.student.widgets.stepsSubtitle")}
      iconName="clipboard"
      slides={slides}
      accentClass="from-amber-50 via-white to-orange-50 border-amber-200/70 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/30 dark:border-amber-500/30"
      dotClass="bg-amber-600 dark:bg-amber-400"
    />
  );
}
