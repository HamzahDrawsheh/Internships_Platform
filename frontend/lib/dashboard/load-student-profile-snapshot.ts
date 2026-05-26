"use client";

import { createClient } from "@/lib/supabase/client";

export type StudentProfileSnapshot = {
  hasDepartment: boolean;
  hasCv: boolean;
  hasApplied: boolean;
  applicationCount: number;
  pendingApplications: number;
  technicalSkills: string[];
  softSkills: string[];
  takenCourses: string[];
  customCourses: string[];
  preferredField: string | null;
  preferredWorkType: string | null;
  preferredLocation: string | null;
  major: string | null;
  gpa: number | null;
};

export async function fetchStudentProfileSnapshot(): Promise<StudentProfileSnapshot | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: studentRow } = await supabase
    .from("students")
    .select("id, department, cv_path, major")
    .eq("user_id", user.id)
    .maybeSingle();

  const [{ data: additional }, { data: appRows }] = await Promise.all([
    supabase
      .from("student_additional_info")
      .select(
        "technical_skills, soft_skills, taken_courses, custom_courses, preferred_field, preferred_work_type, preferred_location, gpa",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    studentRow?.id
      ? supabase.from("applications").select("status").eq("student_id", studentRow.id)
      : Promise.resolve({ data: [] as { status: string }[] }),
  ]);

  const applicationCount = appRows?.length ?? 0;
  const pendingApplications = (appRows ?? []).filter((a) => a.status === "pending").length;

  return {
    hasDepartment: Boolean(studentRow?.department?.trim()),
    hasCv: Boolean(studentRow?.cv_path?.trim()),
    hasApplied: applicationCount > 0,
    applicationCount,
    pendingApplications,
    technicalSkills: Array.isArray(additional?.technical_skills) ? (additional.technical_skills as string[]) : [],
    softSkills: Array.isArray(additional?.soft_skills) ? (additional.soft_skills as string[]) : [],
    takenCourses: Array.isArray(additional?.taken_courses) ? (additional.taken_courses as string[]) : [],
    customCourses: Array.isArray(additional?.custom_courses) ? (additional.custom_courses as string[]) : [],
    preferredField: typeof additional?.preferred_field === "string" ? additional.preferred_field : null,
    preferredWorkType: typeof additional?.preferred_work_type === "string" ? additional.preferred_work_type : null,
    preferredLocation: typeof additional?.preferred_location === "string" ? additional.preferred_location : null,
    major: typeof studentRow?.major === "string" ? studentRow.major : null,
    gpa: typeof additional?.gpa === "number" ? additional.gpa : null,
  };
}
