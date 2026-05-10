/** Calendar end date: today (local) + `weeks` × 7 days, as YYYY-MM-DD for Postgres `date`. */
export function computeTrainingEndDateIso(weeks: number): string | null {
  if (!Number.isFinite(weeks) || weeks < 1) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Math.round(weeks) * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse positive integer weeks from optional internship listing fields. */
export function resolveDurationWeeks(row: {
  duration_weeks?: number | null;
  duration?: string | null;
}): number | null {
  if (typeof row.duration_weeks === "number" && Number.isFinite(row.duration_weeks) && row.duration_weeks > 0) {
    return Math.floor(row.duration_weeks);
  }
  const text = typeof row.duration === "string" ? row.duration.trim() : "";
  const m = /^(\d+)/.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}
