/** Same display rules as Browse Internships recommended section. */
export function resolveDisplayMatchPercent(
  item: { match_percentage: number; recommendation_score?: number | null },
  hasLocationPrefs: boolean,
): { display: number; skill: number; fit: number } {
  const skill = Math.max(0, Math.min(100, Math.round(Number(item.match_percentage) || 0)));
  const fit = Math.max(
    0,
    Math.min(100, Math.round(Number(item.recommendation_score ?? item.match_percentage) || 0)),
  );
  return { display: hasLocationPrefs ? fit : skill, skill, fit };
}
