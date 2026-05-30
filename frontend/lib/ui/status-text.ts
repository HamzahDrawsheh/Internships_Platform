import type { ApplicationStatus } from "@/lib/types";

export type StatusTextVariant = "default" | "success" | "warning" | "danger" | "info";

const VARIANT_TEXT: Record<StatusTextVariant, string> = {
  default: "font-semibold text-slate-700 dark:text-slate-300",
  success: "font-semibold text-emerald-700 dark:text-emerald-400",
  warning: "font-semibold text-amber-700 dark:text-amber-400",
  danger: "font-semibold text-rose-700 dark:text-rose-400",
  info: "font-semibold text-sky-700 dark:text-sky-400",
};

export function statusTextVariantClass(variant: StatusTextVariant): string {
  return VARIANT_TEXT[variant];
}

export function applicationStatusTextClass(status: ApplicationStatus): string {
  switch (status) {
    case "pending":
    case "accepted_pending_commit":
      return VARIANT_TEXT.warning;
    case "accepted":
      return VARIANT_TEXT.success;
    case "rejected":
    case "commitment_expired":
      return VARIANT_TEXT.danger;
    case "completed":
      return VARIANT_TEXT.info;
    case "withdrawn":
    default:
      return VARIANT_TEXT.default;
  }
}

export function applicationStatusToVariant(status: ApplicationStatus): StatusTextVariant {
  switch (status) {
    case "pending":
    case "accepted_pending_commit":
      return "warning";
    case "accepted":
      return "success";
    case "rejected":
    case "commitment_expired":
      return "danger";
    case "completed":
      return "info";
    default:
      return "default";
  }
}

/** Monthly / report workflow statuses (student reports, timelines). */
export function monthlyReportStatusTextClass(status: string): string {
  if (status === "approved") return VARIANT_TEXT.success;
  if (status === "overdue" || status === "rejected") return VARIANT_TEXT.danger;
  if (status === "pending_employer" || status === "pending_supervisor" || status === "pending_student") {
    return VARIANT_TEXT.warning;
  }
  if (status === "unlocked") return VARIANT_TEXT.info;
  return VARIANT_TEXT.default;
}
