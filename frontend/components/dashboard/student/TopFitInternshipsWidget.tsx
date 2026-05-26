"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CyclicWidget } from "@/components/dashboard/CyclicWidget";
import { Button } from "@/components/ui";
import { useDashboardDataRefresh } from "@/lib/dashboard/student-dashboard-sync";
import {
  fetchStudentRecommendations,
  type DashboardRecommendation,
} from "@/lib/dashboard/load-student-recommendations";
import { resolveDisplayMatchPercent } from "@/lib/recommendations/display-match-score";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

function fitTierLabel(fit: number, t: (k: string) => string): string {
  if (fit >= 80) return t("dashboard.student.widgets.fitExcellent");
  if (fit >= 60) return t("dashboard.student.widgets.fitStrong");
  if (fit >= 40) return t("dashboard.student.widgets.fitGood");
  return t("dashboard.student.widgets.fitExplore");
}

export function TopFitInternshipsWidget() {
  const { t } = useI18n();
  const [items, setItems] = useState<DashboardRecommendation[]>([]);
  const [hasActivePrefs, setHasActivePrefs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { items: next, hasActivePrefs: prefsActive } = await fetchStudentRecommendations(12);
      setItems(next.slice(0, 3));
      setHasActivePrefs(prefsActive);
    } catch {
      setItems([]);
      setHasActivePrefs(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useDashboardDataRefresh(useCallback(() => void load(true), [load]));

  const slides = useMemo(
    () =>
      items.map((item, idx) => {
        const { display, skill, fit } = resolveDisplayMatchPercent(item, hasActivePrefs);
        const tier = fitTierLabel(display, t);
        const locationHint = item.listing_location?.trim() || item.listing_work_type?.trim() || null;
        const matchedSkills =
          item.match_insights?.matched_skills?.slice(0, 3) ??
          item.skill_gap?.matchedSkills?.slice(0, 3) ??
          [];

        return {
          id: item.internship_id,
          content: (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
                  #{idx + 1} {t("dashboard.student.widgets.ofTop")} {items.length}
                </span>
                <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-800 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-200">
                  {tier}
                </span>
                {refreshing ? (
                  <span className="text-[10px] font-medium text-violet-600 dark:text-violet-300">
                    {t("dashboard.student.widgets.updating")}
                  </span>
                ) : null}
              </div>
              <h4 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-gray-900 dark:text-white">
                {item.title}
              </h4>
              <p className="mt-1 truncate text-sm font-medium text-violet-700/90 dark:text-violet-300">
                {item.company_name}
              </p>
              {locationHint ? (
                <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-400">{locationHint}</p>
              ) : null}
              <div className="mt-4 flex items-end gap-3">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-300/40 dark:shadow-violet-900/40">
                  <span className="text-lg font-bold tabular-nums leading-none">{display}%</span>
                  <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide opacity-90">
                    {hasActivePrefs
                      ? t("dashboard.student.widgets.fitScore")
                      : t("dashboard.student.widgets.matchScore")}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  {hasActivePrefs ? (
                    <p className="text-[10px] leading-relaxed text-gray-500 dark:text-slate-400">
                      {fmt(t("dashboard.student.widgets.skillsMatchLine"), { skill, fit })}
                    </p>
                  ) : null}
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-slate-400">
                    {t("dashboard.student.widgets.topFitHint")}
                  </p>
                </div>
              </div>
              {matchedSkills.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {matchedSkills.map((skillName) => (
                    <span
                      key={skillName}
                      className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                    >
                      {skillName}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-auto flex gap-2 pt-4">
                <Link href={`/internships/${item.internship_id}`} className="flex-1">
                  <Button variant="primary" className="w-full rounded-xl">
                    {t("dashboard.student.widgets.viewAndApply")}
                  </Button>
                </Link>
                <Link href="/internships">
                  <Button variant="secondary" className="rounded-xl px-3">
                    {t("dashboard.student.widgets.browseMore")}
                  </Button>
                </Link>
              </div>
            </div>
          ),
        };
      }),
    [items, t, hasActivePrefs, refreshing],
  );

  return (
    <CyclicWidget
      title={t("dashboard.student.widgets.topFitTitle")}
      subtitle={t("dashboard.student.widgets.topFitSubtitle")}
      iconName="briefcase"
      slides={slides}
      accentClass="from-violet-50 via-white to-fuchsia-50 border-violet-200/70 dark:from-violet-950/50 dark:via-slate-900 dark:to-fuchsia-950/30 dark:border-violet-500/30"
      dotClass="bg-violet-600 dark:bg-violet-400"
      emptyState={
        loading ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">{t("common.loading")}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">
              {t("dashboard.student.widgets.topFitEmpty")}
            </p>
            <Link href="/profile/student">
              <Button variant="secondary" className="mr-2 rounded-xl">
                {t("common.updateProfile")}
              </Button>
            </Link>
            <Link href="/internships">
              <Button variant="primary" className="rounded-xl">
                {t("nav.browseInternships")}
              </Button>
            </Link>
          </div>
        )
      }
    />
  );
}
