/**
 * Domain types aligned with SQLite schema (CONTEXT_ENG/sqlite-schema.sql).
 * SQLite: boolean → number (0/1), skills → JSON string, dates/timestamps → TEXT.
 */

export type LocationType = "remote" | "onsite" | "hybrid";
export type ApplicationStatus = "submitted" | "under_review" | "accepted" | "rejected";
export type InternshipStatus = "draft" | "active" | "paused" | "closed" | "pending";
export type ProfileRole = "student" | "company" | "supervisor" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: ProfileRole | null;
  is_suspended: number;
  created_at: string;
  updated_at: string;
}

export interface Internship {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  location_type: LocationType | null;
  skills: string[];
  duration_weeks: number | null;
  start_date: string | null;
  deadline: string | null;
  open_positions: number;
  status: InternshipStatus;
  created_at: string;
  updated_at: string;
  company_name?: string;
}

export interface Application {
  id: string;
  internship_id: string;
  student_id: string;
  status: ApplicationStatus;
  cover_letter: string | null;
  created_at: string;
  internship_title?: string;
  company_name?: string;
}

/** Input for creating a profile (e.g. on first auth). */
export interface ProfileInsert {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: ProfileRole | null;
  is_suspended?: number;
}

/** Partial update for profile. */
export interface ProfileUpdate {
  email?: string | null;
  full_name?: string | null;
  role?: ProfileRole | null;
  is_suspended?: number;
}

/** Input for creating an internship. */
export interface InternshipInsert {
  id: string;
  company_id: string;
  title: string;
  description?: string | null;
  location_type?: LocationType | null;
  skills?: string[];
  duration_weeks?: number | null;
  start_date?: string | null;
  deadline?: string | null;
  open_positions?: number;
  status?: InternshipStatus;
}

/** Partial update for internship. */
export interface InternshipUpdate {
  title?: string;
  description?: string | null;
  location_type?: LocationType | null;
  skills?: string[];
  duration_weeks?: number | null;
  start_date?: string | null;
  deadline?: string | null;
  open_positions?: number;
  status?: InternshipStatus;
}

/** Input for creating an application. */
export interface ApplicationInsert {
  id: string;
  internship_id: string;
  student_id: string;
  status?: ApplicationStatus;
  cover_letter?: string | null;
}

export interface ListInternshipsFilters {
  status?: InternshipStatus;
  location_type?: LocationType;
  duration_weeks?: number;
  deadline_lte?: string;
}
