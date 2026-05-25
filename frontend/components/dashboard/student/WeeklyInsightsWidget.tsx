"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CyclicWidget } from "@/components/dashboard/CyclicWidget";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

type WeeklyCounts = {
  newInternshipsLastWeek: number;
  newCompaniesLastWeek: number;
  strongRecommendations: number;
};

export function WeeklyInsightsWidget() {
  const { t } = useI18n();
  const [counts, setCounts] = useState<WeeklyCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [insightsRes, recRes] = await Promise.all([
          fetch("/api/dashboard/student/weekly-insights", { credentials: "same-origin", cache: "no-store" }),
          fetch("/api/recommendations/internships?limit=12", { credentials: "same-origin", cache: "no-store" }),
        ]);

        let newInternshipsLastWeek = 0;
        let newCompaniesLastWeek = 0;
        if (insightsRes.ok) {
          const body = (await insightsRes.json()) as {
            ok?: boolean;
            newInternshipsLastWeek?: number;
            newCompaniesLastWeek?: number;
          };
          if (body.ok) {
            newInternshipsLastWeek = body.newInternshipsLastWeek ?? 0;
            newCompaniesLastWeek = body.newCompaniesLastWeek ?? 0;
          }
        }

        let strongRecommendations = 0;
        if (recRes.ok) {
          const body = (await recRes.json()) as {
            ok?: boolean;
            recommendations?: { match_percentage?: number; recommendation_score?: number }[];
          };
          if (body.ok && Array.isArray(body.recommendations)) {
            strongRecommendations = body.recommendations.filter((r) => {
              const score = Number(r.recommendation_score ?? r.match_percentage ?? 0);
              return score >= 60;
            }).length;
          }
        }

        if (!cancelled) {
          setCounts({ newInternshipsLastWeek, newCompaniesLastWeek, strongRecommendations });
        }
      } catch {
        if (!cancelled) setCounts({ newInternshipsLastWeek: 0, newCompaniesLastWeek: 0, strongRecommendations: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = useMemo(() => {
    if (!counts) return [];
    return [
      {
        id: "internships",
        content: (
          <InsightSlide
            metric={counts.newInternshipsLastWeek}
            label={t("dashboard.student.widgets.insightNewInternships")}
            detail={t("dashboard.student.widgets.insightNewInternshipsDetail")}
            footnote={t("dashboard.student.widgets.weeklyFootnote")}
            href="/internships"
            cta={t("nav.browseInternships")}
            accent="sky"
          />
        ),
      },
      {
        id: "companies",
        content: (
          <InsightSlide
            metric={counts.newCompaniesLastWeek}
            label={t("dashboard.student.widgets.insightNewCompanies")}
            detail={t("dashboard.student.widgets.insightNewCompaniesDetail")}
            footnote={t("dashboard.student.widgets.weeklyFootnote")}
            href="/internships"
            cta={t("dashboard.student.widgets.exploreCompanies")}
            accent="cyan"
          />
        ),
      },
      {
        id: "matches",
        content: (
          <InsightSlide
            metric={counts.strongRecommendations}
            label={t("dashboard.student.widgets.insightStrongMatches")}
            detail={fmt(t("dashboard.student.widgets.insightStrongMatchesDetail"), {
              count: counts.strongRecommendations,
            })}
            footnote={t("dashboard.student.widgets.matchesFootnote")}
            href="/internships"
            cta={t("dashboard.student.widgets.viewMatches")}
            accent="indigo"
          />
        ),
      },
    ];
  }, [counts, t]);

  return (
    <CyclicWidget
      title={t("dashboard.student.widgets.weeklyTitle")}
      subtitle={t("dashboard.student.widgets.weeklySubtitle")}
      iconName="chart"
      slides={slides}
      accentClass="from-sky-50 via-white to-cyan-50 border-sky-200/70 dark:from-sky-950/40 dark:via-slate-900 dark:to-cyan-950/30 dark:border-sky-500/30"
      dotClass="bg-sky-600 dark:bg-sky-400"
      emptyState={
        loading ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">{t("common.loading")}</p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-slate-400">{t("dashboard.student.widgets.weeklyEmpty")}</p>
        )
      }
    />
  );
}

function InsightSlide({
  metric,
  label,
  detail,
  footnote,
  href,
  cta,
  accent,
}: {
  metric: number;
  label: string;
  detail: string;
  footnote: string;
  href: string;
  cta: string;
  accent: "sky" | "cyan" | "indigo";
}) {
  const metricClass =
    accent === "indigo"
      ? "text-indigo-700 dark:text-indigo-300"
      : accent === "cyan"
        ? "text-cyan-700 dark:text-cyan-300"
        : "text-sky-700 dark:text-sky-300";

  return (
    <div className="flex h-full flex-col">
      <p className={`text-4xl font-bold tabular-nums tracking-tight ${metricClass}`}>{metric}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-slate-400">{detail}</p>
      <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
        {footnote}
      </p>
      <Link href={href} className="mt-auto pt-4">
        <Button variant="secondary" className="w-full rounded-xl border-sky-200 dark:border-sky-500/30">
          {cta}
        </Button>
      </Link>
    </div>
  );
}
