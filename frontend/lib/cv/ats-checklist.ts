import type { CvPdfFields } from "@/lib/cv/types";

export type AtsChecklistItem = {
  id: string;
  labelKey: string;
  passed: boolean;
};

const DS_KEYWORD_RE =
  /\b(python|sql|machine learning|deep learning|data science|data analysis|pandas|numpy|scikit|power bi|nlp|transformer|statistics|artificial intelligence|ai\b|ml\b)\b/i;

export function buildAtsChecklist(fields: CvPdfFields): AtsChecklistItem[] {
  const hasContact = Boolean(fields.email.trim() || fields.phone.trim());
  const hasSummary = fields.summary.trim().length >= 40;
  const hasSkills = Boolean(
    fields.skillCategories
      ? Object.values(fields.skillCategories).some((v) => v?.trim())
      : fields.skills.trim()
  );
  const hasProject = Boolean(
    fields.projectSlots?.some((slot) => slot.name.trim() && (slot.description.trim() || slot.achievements.trim())) ||
      fields.projects.trim()
  );
  const hasEducation = Boolean(fields.university.trim() && fields.major.trim());
  const hasCertifications = Boolean(fields.certifications?.trim());
  const hasLinks = Boolean(fields.linkedin.trim() || fields.githubPortfolio.trim());

  const keywordHaystack = [
    fields.summary,
    fields.skills,
    fields.experience,
    fields.projects,
    fields.major,
    ...(fields.skillCategories ? Object.values(fields.skillCategories) : []),
  ].join(" ");

  const hasDsKeywords = DS_KEYWORD_RE.test(keywordHaystack);

  return [
    { id: "contact", labelKey: "cvBuilder.ats.contact", passed: hasContact },
    { id: "summary", labelKey: "cvBuilder.ats.summary", passed: hasSummary },
    { id: "skills", labelKey: "cvBuilder.ats.skills", passed: hasSkills },
    { id: "projects", labelKey: "cvBuilder.ats.projects", passed: hasProject },
    { id: "education", labelKey: "cvBuilder.ats.education", passed: hasEducation },
    { id: "certifications", labelKey: "cvBuilder.ats.certifications", passed: hasCertifications },
    { id: "links", labelKey: "cvBuilder.ats.links", passed: hasLinks },
    { id: "keywords", labelKey: "cvBuilder.ats.keywords", passed: hasDsKeywords },
  ];
}
