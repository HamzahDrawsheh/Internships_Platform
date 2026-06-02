import {
  CV_SKILL_CATEGORY_KEYS,
  CV_SKILL_CATEGORY_LABELS,
  EMPTY_CV_PROJECT_SLOT,
  EMPTY_CV_SKILL_CATEGORIES,
  type CvProjectSlot,
  type CvSkillCategories,
  type CvSkillCategoryKey,
} from "@/lib/cv/types";

const CATEGORY_LINE_RE = /^([^:]+):\s*(.+)$/;

export function createEmptyProjectSlots(count = 3): CvProjectSlot[] {
  return Array.from({ length: count }, () => ({ ...EMPTY_CV_PROJECT_SLOT }));
}

export function mergeSkillCategories(input: Partial<CvSkillCategories> | null | undefined): CvSkillCategories {
  const merged = { ...EMPTY_CV_SKILL_CATEGORIES };
  if (!input) return merged;
  for (const key of CV_SKILL_CATEGORY_KEYS) {
    merged[key] = typeof input[key] === "string" ? input[key].trim() : "";
  }
  return merged;
}

export function parseSkillCategoriesFromText(raw: string): CvSkillCategories {
  const categories = { ...EMPTY_CV_SKILL_CATEGORIES };
  const trimmed = raw.trim();
  if (!trimmed) return categories;

  const lines = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let matchedAny = false;

  for (const line of lines) {
    const match = CATEGORY_LINE_RE.exec(line);
    if (!match) continue;
    const label = match[1].trim().toLowerCase();
    const values = match[2].trim();
    const key = CV_SKILL_CATEGORY_KEYS.find(
      (k) => CV_SKILL_CATEGORY_LABELS[k].toLowerCase() === label
    );
    if (key && values) {
      categories[key] = values;
      matchedAny = true;
    }
  }

  if (!matchedAny) {
    categories.programmingLanguages = trimmed.replace(/\n+/g, ", ");
  }

  return categories;
}

export function serializeSkillCategories(categories: CvSkillCategories): string {
  return CV_SKILL_CATEGORY_KEYS.map((key) => {
    const values = categories[key]?.trim();
    if (!values) return "";
    return `${CV_SKILL_CATEGORY_LABELS[key]}: ${values}`;
  })
    .filter(Boolean)
    .join("\n");
}

export function flattenSkillCategories(categories: CvSkillCategories): string {
  const parts = CV_SKILL_CATEGORY_KEYS.flatMap((key) =>
    categories[key]
      ?.split(/[,;\n|/]+/)
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(part);
    }
  }
  return out.join(", ");
}

function achievementsToBullets(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-*–]+/, "").trim())
    .filter(Boolean);
}

export function serializeProjectSlots(slots: CvProjectSlot[]): string {
  return slots
    .map((slot) => {
      const name = slot.name.trim();
      if (!name) return "";
      const lines: string[] = [name];
      if (slot.technologies.trim()) {
        lines.push(`Technologies: ${slot.technologies.trim()}`);
      }
      if (slot.description.trim()) {
        lines.push(slot.description.trim());
      }
      for (const bullet of achievementsToBullets(slot.achievements)) {
        lines.push(`• ${bullet}`);
      }
      if (slot.link.trim()) {
        lines.push(`Link: ${slot.link.trim()}`);
      }
      return lines.join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function parseProjectSlotsFromText(raw: string, maxSlots = 3): CvProjectSlot[] {
  const slots = createEmptyProjectSlots(maxSlots);
  const trimmed = raw.trim();
  if (!trimmed) return slots;

  const blocks = trimmed.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  blocks.slice(0, maxSlots).forEach((block, index) => {
    const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;

    const slot: CvProjectSlot = { ...EMPTY_CV_PROJECT_SLOT };
    slot.name = lines[0] ?? "";

    const bodyLines: string[] = [];
    for (const line of lines.slice(1)) {
      const techMatch = /^technologies\s*:\s*(.+)$/i.exec(line);
      const linkMatch = /^link\s*:\s*(.+)$/i.exec(line);
      const bulletMatch = /^[•\-*–]\s*(.+)$/.exec(line);

      if (techMatch) {
        slot.technologies = techMatch[1].trim();
      } else if (linkMatch) {
        slot.link = linkMatch[1].trim();
      } else if (bulletMatch) {
        slot.achievements = slot.achievements
          ? `${slot.achievements}\n${bulletMatch[1].trim()}`
          : bulletMatch[1].trim();
      } else {
        bodyLines.push(line);
      }
    }

    if (bodyLines.length && !slot.description) {
      slot.description = bodyLines.join("\n");
    }

    slots[index] = slot;
  });

  return slots;
}

export function mergeStructuredProjectSlots(
  structured: CvProjectSlot[] | null | undefined,
  legacyText: string,
  maxSlots = 3
): CvProjectSlot[] {
  const fromStructured = (structured ?? []).filter((slot) => slot.name.trim());
  if (fromStructured.length) {
    const slots = createEmptyProjectSlots(maxSlots);
    fromStructured.slice(0, maxSlots).forEach((slot, index) => {
      slots[index] = { ...EMPTY_CV_PROJECT_SLOT, ...slot };
    });
    return slots;
  }
  return parseProjectSlotsFromText(legacyText, maxSlots);
}

export function parseSkillCategoriesFromStored(
  stored: Partial<CvSkillCategories> | null | undefined,
  legacySkills: string
): CvSkillCategories {
  const merged = mergeSkillCategories(stored);
  const hasAny = CV_SKILL_CATEGORY_KEYS.some((key) => merged[key].trim());
  if (hasAny) return merged;
  return parseSkillCategoriesFromText(legacySkills);
}
