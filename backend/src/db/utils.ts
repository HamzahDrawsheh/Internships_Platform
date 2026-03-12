import type { Application, ApplicationStatus, Internship, InternshipStatus, LocationType, Profile, ProfileRole } from "../models/types";

/** Parse skills column (JSON array string) to string[]. */
export function parseSkills(value: string | null | undefined): string[] {
  if (value == null || value === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Serialize skills array to JSON string for storage. */
export function serializeSkills(skills: string[]): string {
  return JSON.stringify(skills);
}

/** Map raw profiles row to Profile. */
export function mapRowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: row.email != null ? String(row.email) : null,
    full_name: row.full_name != null ? String(row.full_name) : null,
    role: row.role != null ? (row.role as ProfileRole) : null,
    is_suspended: Number(row.is_suspended) ?? 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/** Map raw internships row (optionally with company full_name) to Internship. */
export function mapRowToInternship(row: Record<string, unknown>): Internship {
  return {
    id: String(row.id),
    company_id: String(row.company_id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    location_type: row.location_type != null ? (row.location_type as LocationType) : null,
    skills: parseSkills(row.skills as string),
    duration_weeks: row.duration_weeks != null ? Number(row.duration_weeks) : null,
    start_date: row.start_date != null ? String(row.start_date) : null,
    deadline: row.deadline != null ? String(row.deadline) : null,
    open_positions: Number(row.open_positions) ?? 1,
    status: (row.status as InternshipStatus) ?? "draft",
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    ...(row.company_name != null && { company_name: String(row.company_name) }),
  };
}

/** Map raw applications row (optionally with internship_title, company_name) to Application. */
export function mapRowToApplication(row: Record<string, unknown>): Application {
  return {
    id: String(row.id),
    internship_id: String(row.internship_id),
    student_id: String(row.student_id),
    status: (row.status as ApplicationStatus) ?? "submitted",
    cover_letter: row.cover_letter != null ? String(row.cover_letter) : null,
    created_at: String(row.created_at),
    ...(row.internship_title != null && { internship_title: String(row.internship_title) }),
    ...(row.company_name != null && { company_name: String(row.company_name) }),
  };
}
