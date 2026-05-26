/** JUST employer evaluation form options (Part II). */

export const EVAL_RELATIONS = [
  "Exceptionally well accepted",
  "Works well with others",
  "Gets along satisfactorily",
  "Some difficulty working with others",
  "Works very poorly with others",
] as const;

export const EVAL_ABILITY_TO_LEARN = [
  "Learns very quickly",
  "Learns readily",
  "Average in learning",
  "Rather slow to learn",
  "Very slow to learn",
] as const;

export const EVAL_DEPENDABILITY = [
  "Completely dependable",
  "Above average in dependability",
  "Usually dependable",
  "Sometimes neglectful or careless",
  "Unreliable",
] as const;

export const EVAL_OVERALL = [
  "Outstanding",
  "Very Good",
  "Average",
  "Marginal",
  "Unsatisfactory",
] as const;

export const EVAL_WORK_ETHICS = [
  "Excellent",
  "Very good",
  "Average",
  "Below average",
  "Very poor",
] as const;

export const EVAL_ATTITUDES = [
  "Enthusiastic",
  "Very interested",
  "Average interest",
  "Somewhat indifferent",
  "Not interested",
] as const;

export const EVAL_QUALITY = [
  "Excellent",
  "Very good",
  "Average",
  "Below average",
  "Very poor",
] as const;

export const EVAL_ATTENDANCE = ["Very Good", "Good", "Satisfactory"] as const;

export const MONTHLY_REPORT_STATUS_LABELS: Record<string, string> = {
  locked: "Locked",
  unlocked: "Ready to submit",
  pending_student: "Draft in progress",
  pending_employer: "Awaiting employer",
  pending_supervisor: "Awaiting supervisor",
  approved: "Approved",
  rejected: "Needs revision",
  overdue: "Overdue",
};

export const MONTHLY_REPORT_STATUS_COLORS: Record<string, string> = {
  locked: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  unlocked: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  pending_student: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  pending_employer: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  pending_supervisor: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  overdue: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
};

export const REPORT_PDF_BUCKET = "internship-report-pdfs";
export const FINAL_REPORT_BUCKET = "final-internship-reports";
export const MAX_FINAL_REPORT_BYTES = 50 * 1024 * 1024;
