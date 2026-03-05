// Shared domain types (aligned with Supabase schema).

export type LocationType = "remote" | "onsite" | "hybrid";
export type ApplicationStatus = "submitted" | "under_review" | "accepted" | "rejected";
export type InternshipStatus = "draft" | "active" | "paused" | "closed" | "pending";
export type ProfileRole = "student" | "company" | "supervisor" | "admin";

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
  created_at?: string;
  updated_at?: string;
  company_name?: string;
  applicants_count?: number;
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
