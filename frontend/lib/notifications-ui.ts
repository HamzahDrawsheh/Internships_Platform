/** Shared notification types and presentation helpers for list UI + dropdown. */

export type NotificationRowType =
  | "accepted"
  | "rejected"
  | "application_accepted"
  | "application_rejected"
  | "info"
  | "training_completed"
  | "application_expired"
  | "new_application"
  | "new_feedback"
  | "new_training_evaluation"
  | "new_direct_message"
  | "monthly_report_unlocked"
  | "monthly_report_overdue"
  | "monthly_report_pending_employer"
  | "monthly_report_pending_supervisor"
  | "monthly_report_approved"
  | "monthly_report_rejected"
  | "internship_pending_supervisor"
  | "internship_supervisor_approved"
  | "final_report_required"
  | "final_report_submitted";

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: NotificationRowType;
  is_read: boolean;
  created_at: string;
  related_conversation_id?: string | null;
  related_internship_id?: string | null;
  related_monthly_report_id?: string | null;
};

export function getNotificationTypeStyles(type: NotificationRowType) {
  if (type === "accepted" || type === "application_accepted") {
    return {
      icon: "🎉",
      accentClass: "border-l-green-500",
      titleClass: "text-green-800 dark:text-green-300",
    };
  }

  if (type === "rejected" || type === "application_rejected") {
    return {
      icon: "❌",
      accentClass: "border-l-red-500",
      titleClass: "text-red-800 dark:text-red-300",
    };
  }

  if (type === "training_completed") {
    return {
      icon: "🎓",
      accentClass: "border-l-indigo-500",
      titleClass: "text-indigo-800 dark:text-indigo-300",
    };
  }

  if (type === "application_expired") {
    return {
      icon: "⏱️",
      accentClass: "border-l-amber-500",
      titleClass: "text-amber-800 dark:text-amber-300",
    };
  }

  if (type === "new_application") {
    return {
      icon: "📥",
      accentClass: "border-l-sky-500",
      titleClass: "text-sky-800 dark:text-sky-300",
    };
  }

  if (type === "new_feedback" || type === "new_training_evaluation") {
    return {
      icon: "⭐",
      accentClass: "border-l-violet-500",
      titleClass: "text-violet-800 dark:text-violet-300",
    };
  }

  if (type === "new_direct_message") {
    return {
      icon: "💬",
      accentClass: "border-l-fuchsia-500",
      titleClass: "text-fuchsia-800 dark:text-fuchsia-300",
    };
  }

  if (
    type === "monthly_report_unlocked" ||
    type === "monthly_report_overdue" ||
    type === "final_report_required"
  ) {
    return {
      icon: "📅",
      accentClass: "border-l-orange-500",
      titleClass: "text-orange-800 dark:text-orange-300",
    };
  }

  if (type === "monthly_report_pending_employer" || type === "monthly_report_pending_supervisor") {
    return {
      icon: "📝",
      accentClass: "border-l-amber-500",
      titleClass: "text-amber-800 dark:text-amber-300",
    };
  }

  if (type === "monthly_report_approved" || type === "internship_supervisor_approved" || type === "final_report_submitted") {
    return {
      icon: "✅",
      accentClass: "border-l-green-500",
      titleClass: "text-green-800 dark:text-green-300",
    };
  }

  if (type === "monthly_report_rejected") {
    return {
      icon: "↩️",
      accentClass: "border-l-red-500",
      titleClass: "text-red-800 dark:text-red-300",
    };
  }

  if (type === "internship_pending_supervisor") {
    return {
      icon: "🎓",
      accentClass: "border-l-indigo-500",
      titleClass: "text-indigo-800 dark:text-indigo-300",
    };
  }

  return {
    icon: "🔔",
    accentClass: "border-l-blue-400",
    titleClass: "text-gray-900 dark:text-white",
  };
}

export function formatNotificationDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
}
