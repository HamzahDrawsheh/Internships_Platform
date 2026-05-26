"use client";

import { useEffect } from "react";

export const COMPANY_DASHBOARD_UPDATED_EVENT = "internconnect:company-dashboard-updated";

/** Call after company actions that affect dashboard widgets (applications, reports, listings). */
export function notifyCompanyDashboardUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMPANY_DASHBOARD_UPDATED_EVENT));
}

const REFRESH_INTERVAL_MS = 30_000;

/** Refetch company dashboard widgets on custom event, tab focus, and periodic poll while visible. */
export function useCompanyDashboardRefresh(onRefresh: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (document.visibilityState === "visible") onRefresh();
    };

    window.addEventListener(COMPANY_DASHBOARD_UPDATED_EVENT, run);
    document.addEventListener("visibilitychange", run);
    const interval = window.setInterval(run, REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener(COMPANY_DASHBOARD_UPDATED_EVENT, run);
      document.removeEventListener("visibilitychange", run);
      window.clearInterval(interval);
    };
  }, [enabled, onRefresh]);
}
