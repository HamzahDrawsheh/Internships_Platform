/** Normalize a skill label for case-insensitive comparison. */
export function normalizeSkillKey(skill: string): string {
  return skill.trim().toLowerCase().replace(/\s+/g, " ");
}

export function skillExistsInList(skill: string, list: string[]): boolean {
  const key = normalizeSkillKey(skill);
  if (!key) return false;
  return list.some((item) => normalizeSkillKey(item) === key);
}

/** Append skill to array if not already present (case-insensitive). Returns new array. */
export function mergeTechnicalSkill(list: string[], skill: string): string[] {
  const trimmed = skill.trim();
  if (!trimmed) return [...list];
  if (skillExistsInList(trimmed, list)) return [...list];
  return [...list, trimmed];
}

export function mergeTechnicalSkills(list: string[], skills: string[]): string[] {
  let result = [...list];
  for (const skill of skills) {
    result = mergeTechnicalSkill(result, skill);
  }
  return result;
}
