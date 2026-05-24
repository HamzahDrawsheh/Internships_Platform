/** Lowercase key for grouping/filtering industries regardless of casing. */
export function industryFilterKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Consistent display label (title case per word). */
export function formatIndustryLabel(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Unique industry labels for filter chips, case-insensitive. */
export function uniqueIndustryLabels(values: Array<string | null | undefined>): string[] {
  const byKey = new Map<string, string>();

  for (const raw of values) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;

    const key = industryFilterKey(trimmed);
    if (!byKey.has(key)) {
      byKey.set(key, formatIndustryLabel(trimmed));
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
}

export function industriesMatch(
  companyIndustry: string | null | undefined,
  selectedIndustry: string,
): boolean {
  if (selectedIndustry === "All") return true;
  return industryFilterKey(companyIndustry) === industryFilterKey(selectedIndustry);
}

/** Normalize before persisting to the database. */
export function normalizeIndustryForStorage(value: string | null | undefined): string | null {
  const formatted = formatIndustryLabel(value);
  return formatted || null;
}
