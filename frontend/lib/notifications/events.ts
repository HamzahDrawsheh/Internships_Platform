/**
 * Canonical map of platform notification events and how they are delivered.
 * Keep in sync with DB triggers, RPCs, and dispatch API callers.
 */
export const NOTIFICATION_EVENT_SOURCES = [
  { event: "Student applies to internship", type: "new_application", delivery: "api/dispatch (apply)" },
  { event: "Company accepts / rejects / completes application", type: "commitment_required | application_rejected | training_completed", delivery: "api/dispatch (company UI)" },
  { event: "Listing closed with pending applicants", type: "application_expired", delivery: "api/dispatch (company UI)" },
  { event: "Student rates company", type: "new_feedback", delivery: "api/dispatch (applications)" },
  { event: "Student training evaluation", type: "new_training_evaluation", delivery: "api/dispatch (applications)" },
  { event: "Commitment confirm / withdraw / expire", type: "commitment_* | application_withdrawn", delivery: "DB RPC student_confirm + expire_stale" },
  { event: "Internship pending supervisor", type: "internship_pending_supervisor", delivery: "DB initialize_internship_from_application" },
  { event: "Supervisor approves tracking", type: "internship_supervisor_approved", delivery: "DB approve_internship_by_supervisor" },
  { event: "Monthly report status change", type: "monthly_report_*", delivery: "DB trigger trg_imr_notify_on_status_change" },
  { event: "Final report uploaded", type: "final_report_submitted", delivery: "DB trigger trg_ifr_notify_on_submit" },
  { event: "Direct message", type: "new_direct_message", delivery: "DB trigger dm_notify_recipient_on_message" },
  { event: "Training auto-completed", type: "training_completed", delivery: "DB auto_complete_expired_trainings" },
  { event: "Role upgrade approved / rejected", type: "info", delivery: "DB approve/reject_role_upgrade_request" },
] as const;
