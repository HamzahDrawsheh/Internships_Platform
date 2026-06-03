/** Normalizes DB/API date values for HTML `<input type="date">` (YYYY-MM-DD). */
export function normalizeDateInputValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

export function listingScheduleIsSet(startDate: string, endDate: string, applicationDeadline: string): boolean {
  return Boolean(
    normalizeDateInputValue(startDate) ||
      normalizeDateInputValue(endDate) ||
      normalizeDateInputValue(applicationDeadline)
  );
}

export function computeDurationWeeksFromDates(startDate: string, endDate: string): number | null {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  const diffDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const weeks = Math.max(1, Math.ceil((diffDays + 1) / 7));
  return weeks;
}

export function formatInternshipDateLabel(value?: string | null): string | undefined {
  const d = normalizeDateInputValue(value);
  if (!d) return undefined;
  const parsed = new Date(`${d}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatInternshipDateRange(startDate?: string | null, endDate?: string | null): string | null {
  const start = typeof startDate === "string" ? startDate.trim() : "";
  const end = typeof endDate === "string" ? endDate.trim() : "";
  if (!start && !end) return null;

  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (start && end) return `${format(start)} – ${format(end)}`;
  if (start) return `Starts ${format(start)}`;
  return `Ends ${format(end)}`;
}

export function validateInternshipDates(startDate: string, endDate: string): string | null {
  const start = startDate.trim();
  const end = endDate.trim();

  if (!start || !end) {
    return "Start date and end date are required.";
  }

  const startMs = new Date(`${start}T00:00:00`).getTime();
  const endMs = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return "Enter valid start and end dates.";
  }
  if (endMs < startMs) {
    return "End date must be on or after the start date.";
  }

  return null;
}

export function buildInternshipScheduleFields(
  startDate: string,
  endDate: string,
  applicationDeadline?: string
) {
  const start_date = startDate.trim();
  const end_date = endDate.trim();
  const application_deadline = (applicationDeadline?.trim() || start_date) || null;
  const duration_weeks = computeDurationWeeksFromDates(start_date, end_date);
  const duration = duration_weeks != null ? `${duration_weeks} weeks` : null;

  return {
    start_date,
    end_date,
    application_deadline,
    duration_weeks,
    duration,
  };
}
