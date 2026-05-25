"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CyclicWidget } from "@/components/dashboard/CyclicWidget";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";

type RecItem = {
  internship_id: string;
  title: string;
  company_name: string;
  match_percentage: number;
  recommendation_score?: number;
  listing_work_type?: string | null;
  listing_location?: string | null;
};

function fitTierLabel(fit: number, t: (k: string) => string): string {
  if (fit >= 80) return t("dashboard.student.widgets.fitExcellent");
  if (fit >= 60) return t("dashboard.student.widgets.fitStrong");
  if (fit >= 40) return t("dashboard.student.widgets.fitGood");
  return t("dashboard.student.widgets.fitExplore");
}

export function TopFitInternshipsWidget() {
  const { t } = useI18n();
  const [items, setItems] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/recommendations/internships?limit=3", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setItems([]);
          return;
        }
        const body = (await res.json()) as { ok?: boolean; recommendations?: RecItem[] };
        if (!cancelled && body.ok && Array.isArray(body.recommendations)) {
          setItems(body.recommendations.slice(0, 3));
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = useMemo(
    () =>
      items.map((item, idx) => {
        const fit = Math.round(Number(item.recommendation_score ?? item.match_percentage ?? 0));
        const tier = fitTierLabel(fit, t);
        const locationHint = item.listing_location?.trim() || item.listing_work_type?.trim() || null;

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
                  <span className="text-lg font-bold tabular-nums leading-none">{fit}%</span>
                  <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide opacity-90">
                    {t("dashboard.student.widgets.fitScore")}
                  </span>
                </div>
                <p className="pb-1 text-xs leading-relaxed text-gray-600 dark:text-slate-400">
                  {t("dashboard.student.widgets.topFitHint")}
                </p>
              </div>
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
    [items, t]
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
