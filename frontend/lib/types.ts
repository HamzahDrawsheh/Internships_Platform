// Shared domain types aligned with current Supabase schema.

export type { AcademicDepartment } from "./departments";

export type LocationType = "remote" | "onsite" | "hybrid";
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "completed";
export type InternshipStatus = "active" | "inactive";
export type ProfileRole = "student" | "company" | "supervisor" | "admin";

export interface Internship {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  duration: string | null;
  location: string | null;
  type: string | null;
  is_active: boolean;
  created_at: string;
  company_name?: string;
  applicants_count?: number;
}

export interface Application {
  id: string;
  student_id: string;
  position_id: string;
  company_id?: string;
  status: ApplicationStatus;
  message: string | null;
  applied_at: string;
  internship_title?: string;
  company_name?: string;
}
