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
  | "new_direct_message";

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: NotificationRowType;
  is_read: boolean;
  created_at: string;
  related_conversation_id?: string | null;
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
