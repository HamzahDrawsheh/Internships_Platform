/** Calendar date (YYYY-MM-DD) in local-less UTC slice for consistent comparisons. */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isApplicationDeadlinePassed(
  deadline: string | null | undefined,
  asOf: string = todayIsoDate()
): boolean {
  const d = typeof deadline === "string" ? deadline.trim() : "";
  if (!d) return false;
  return d < asOf;
}

export function isInternshipOpenForApplications(position: {
  is_active?: boolean | null;
  application_deadline?: string | null;
} | null | undefined): boolean {
  if (!position || position.is_active === false) return false;
  return !isApplicationDeadlinePassed(position.application_deadline);
}

export type InternshipListingStatus = "active" | "expired" | "inactive";

/** Matches company internship list: active, deadline-expired, or paused/closed. */
export function getInternshipListingStatus(
  position: {
    is_active?: boolean | null;
    application_deadline?: string | null;
  },
  asOf: string = todayIsoDate()
): InternshipListingStatus {
  const deadlinePassed = isApplicationDeadlinePassed(position.application_deadline, asOf);
  if (deadlinePassed) return "expired";
  if (position.is_active === false) return "inactive";
  return "active";
}

export function formatApplicationDeadlineLabel(deadline: string | null | undefined): string | undefined {
  const d = typeof deadline === "string" ? deadline.trim() : "";
  if (!d) return undefined;
  const parsed = new Date(`${d}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function validateApplicationDeadline(
  applicationDeadline: string,
  startDate: string
): string | null {
  const app = applicationDeadline.trim();
  const start = startDate.trim();
  if (!app) return "Application deadline is required.";
  if (!start) return null;
  if (app > start) {
    return "Application deadline must be on or before the internship start date.";
  }
  return null;
}
