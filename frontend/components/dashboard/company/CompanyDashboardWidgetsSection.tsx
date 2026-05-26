"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DashboardCyclicControls,
  DashboardCyclicSyncProvider,
} from "@/components/dashboard/DashboardCyclicSync";
import { CompanyGrowListingsWidget } from "@/components/dashboard/company/CompanyGrowListingsWidget";
import { CompanyReputationWidget } from "@/components/dashboard/company/CompanyReputationWidget";
import { CompanyTraineeProgressWidget } from "@/components/dashboard/company/CompanyTraineeProgressWidget";
import { useCompanyDashboardRefresh } from "@/lib/dashboard/company-dashboard-sync";
import { useI18n } from "@/lib/i18n/context";
import {
  fetchCompanyDashboardSnapshot,
  type CompanyDashboardSnapshot,
} from "@/lib/dashboard/load-company-dashboard-snapshot";

function WidgetsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-h-[240px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-slate-800 dark:bg-slate-900"
        />
      ))}
    </div>
  );
}

export function CompanyDashboardWidgetsSection() {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<CompanyDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchCompanyDashboardSnapshot();
    setSnapshot(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useCompanyDashboardRefresh(refresh);

  return (
    <DashboardCyclicSyncProvider>
      <section className="space-y-3">
        {loading && !snapshot ? (
          <WidgetsSkeleton />
        ) : snapshot ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <CompanyReputationWidget snapshot={snapshot} />
            <CompanyGrowListingsWidget snapshot={snapshot} />
            <CompanyTraineeProgressWidget snapshot={snapshot} />
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {t("dashboard.company.widgets.onboardingRequired")}
          </p>
        )}
        <DashboardCyclicControls slideCount={3} />
      </section>
    </DashboardCyclicSyncProvider>
  );
}
