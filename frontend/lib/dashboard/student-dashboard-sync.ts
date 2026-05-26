"use client";

import { useEffect } from "react";

export const STUDENT_PROFILE_UPDATED_EVENT = "internconnect:student-profile-updated";

/** Call after student profile save so dashboard widgets reload fresh data. */
export function notifyStudentProfileUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STUDENT_PROFILE_UPDATED_EVENT));
}

const REFRESH_INTERVAL_MS = 45_000;

/** Refetch dashboard widget data on profile save, tab focus, and periodic poll while visible. */
export function useDashboardDataRefresh(onRefresh: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (document.visibilityState === "visible") onRefresh();
    };

    window.addEventListener(STUDENT_PROFILE_UPDATED_EVENT, run);
    document.addEventListener("visibilitychange", run);
    const interval = window.setInterval(run, REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener(STUDENT_PROFILE_UPDATED_EVENT, run);
      document.removeEventListener("visibilitychange", run);
      window.clearInterval(interval);
    };
  }, [enabled, onRefresh]);
}
