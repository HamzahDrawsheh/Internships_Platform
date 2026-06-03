import { todayIsoDate } from "@/lib/internships/application-deadline";
import { normalizeDateInputValue } from "@/lib/internships/dates";

/** Default new apply-by date when reopening an expired listing (+14 days, capped at start). */
export function suggestExtendedApplicationDeadline(startDate: string | null | undefined): string {
  const today = todayIsoDate();
  const plus14 = new Date(`${today}T00:00:00`);
  plus14.setDate(plus14.getDate() + 14);
  let suggested = plus14.toISOString().slice(0, 10);

  const start = normalizeDateInputValue(startDate);
  if (start && suggested > start) {
    suggested = start;
  }
  return suggested;
}
