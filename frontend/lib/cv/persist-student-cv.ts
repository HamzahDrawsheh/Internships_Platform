import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCvPreferencesPayload,
  parseCsv,
  parseCvStudentPreferences,
} from "@/lib/cv/student-cv-preferences";
import { mergeTechnicalSkills } from "@/lib/skills/technical-skills-merge";

export type CvPersistFields = {
  fullName: string;
  phone: string;
  city: string;
  university: string;
  major: string;
  department: string;
  summary: string;
  skills: string;
  experience: string;
  projects: string;
  linkedin: string;
  githubPortfolio: string;
};

export type PersistStudentCvResult =
  | { ok: true }
  | { ok: false; error: string };

export async function persistStudentCvFields(
  supabase: SupabaseClient,
  userId: string,
  studentId: string,
  fields: CvPersistFields,
  existingPreferences: unknown,
): Promise<PersistStudentCvResult> {
  const preferencesPayload = buildCvPreferencesPayload(existingPreferences, {
    experience: fields.experience,
    summary: fields.summary,
    projects: fields.projects,
    linkedin: fields.linkedin,
    githubPortfolio: fields.githubPortfolio,
    phone: fields.phone,
  });

  const { error: studentError } = await supabase
    .from("students")
    .update({
      university: fields.university.trim() || null,
      major: fields.major.trim() || null,
      department: fields.department.trim() || null,
      skills: fields.skills.trim() || null,
      preferences: preferencesPayload,
    })
    .eq("id", studentId);

  if (studentError) {
    return { ok: false, error: studentError.message || "Failed to save CV profile fields." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fields.fullName.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    return { ok: false, error: profileError.message || "Failed to save profile name." };
  }

  const { data: additional } = await supabase
    .from("student_additional_info")
    .select("technical_skills, soft_skills, taken_courses, gpa, preferred_field, preferred_work_type, availability")
    .eq("user_id", userId)
    .maybeSingle();

  const parsedSkills = parseCsv(fields.skills);
  const mergedTechnical = mergeTechnicalSkills(additional?.technical_skills ?? [], parsedSkills);

  const { error: additionalError } = await supabase.from("student_additional_info").upsert(
    {
      user_id: userId,
      technical_skills: mergedTechnical,
      soft_skills: additional?.soft_skills ?? [],
      taken_courses: additional?.taken_courses ?? [],
      gpa: additional?.gpa ?? null,
      preferred_field: additional?.preferred_field ?? null,
      preferred_work_type: additional?.preferred_work_type ?? null,
      preferred_location: fields.city.trim() || null,
      availability: additional?.availability ?? null,
    },
    { onConflict: "user_id" },
  );

  if (additionalError) {
    return { ok: false, error: additionalError.message || "Failed to save CV skills." };
  }

  return { ok: true };
}

export { parseCvStudentPreferences };
