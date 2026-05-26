export type InternshipStatus = "pending_supervisor_approval" | "active" | "completed" | "cancelled";

export type MonthlyReportStatus =
  | "locked"
  | "unlocked"
  | "pending_student"
  | "pending_employer"
  | "pending_supervisor"
  | "approved"
  | "rejected"
  | "overdue";

export type AttendanceStatus = "present" | "absent" | "excused" | "holiday";

export type FinalReportStatus = "submitted" | "approved" | "rejected";

export interface InternshipRow {
  id: string;
  application_id: string;
  student_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  status: InternshipStatus;
  supervisor_approved_at: string | null;
  university_supervisor_name: string | null;
  employer_supervisor_name: string | null;
}

export interface MonthlyReportRow {
  id: string;
  internship_id: string;
  month_number: number;
  period_start: string;
  period_end: string;
  unlock_date: string;
  due_date: string;
  status: MonthlyReportStatus;
  assignments: string | null;
  work_summary: string | null;
  form_student_name: string | null;
  form_student_id: string | null;
  form_department: string | null;
  form_employer_name: string | null;
  form_university_supervisor: string | null;
  student_submission_date: string | null;
  employer_submission_date: string | null;
  supervisor_approval_date: string | null;
  supervisor_comments: string | null;
  rejection_reason: string | null;
  generated_pdf_url: string | null;
}

export interface WeeklyReportRow {
  id: string;
  monthly_report_id: string;
  week_number: number;
  description: string;
}

export interface AttendanceRow {
  id: string;
  internship_id: string;
  date: string;
  weekday: string | null;
  attendance_status: AttendanceStatus;
  start_time: string | null;
  end_time: string | null;
  total_hours: number | null;
  remarks: string | null;
  student_signed_at: string | null;
  mentor_signed_at: string | null;
}

export interface EmployerEvaluationRow {
  id: string;
  monthly_report_id: string;
  relations_with_others: string;
  ability_to_learn: string;
  dependability: string;
  overall_performance: string;
  work_ethics: string;
  attitudes: string;
  quality_of_work: string;
  attendance_record: string;
  advancement_traits: string | null;
  additional_remarks: string | null;
  evaluator_name: string | null;
}

export interface FinalReportRow {
  id: string;
  internship_id: string;
  pdf_url: string;
  status: FinalReportStatus;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}
