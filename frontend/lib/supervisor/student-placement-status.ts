import {
  applicationStatusTextClass,
  statusTextVariantClass,
  type StatusTextVariant,
} from "@/lib/ui/status-text";
import type { ApplicationStatus } from "@/lib/types";

export type StudentPlacementStatus = "Completed" | "Active" | "Pending" | "Available";

const APPLICATION_STATUSES = new Set<string>([
  "pending",
  "accepted_pending_commit",
  "accepted",
  "rejected",
  "completed",
  "commitment_expired",
  "withdrawn",
]);

export function deriveStudentPlacementStatus(applications: { status: string }[]): StudentPlacementStatus {
  if (applications.length === 0) return "Available";

  const hasCompleted = applications.some((a) => a.status === "completed");
  const hasAccepted = applications.some((a) => a.status === "accepted");
  const hasPending =
    applications.some((a) => a.status === "pending") ||
    applications.some((a) => a.status === "accepted_pending_commit");

  if (hasCompleted) return "Completed";
  if (hasAccepted) return "Active";
  if (hasPending) return "Pending";
  return "Available";
}

export function placementStatusBadgeVariant(
  status: StudentPlacementStatus,
): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "Completed" || status === "Active") return "success";
  if (status === "Pending") return "warning";
  if (status === "Available") return "info";
  return "default";
}

export function applicationStatusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  const k = status.trim().toLowerCase();
  if (k === "accepted" || k === "completed") return "success";
  if (k === "pending" || k === "accepted_pending_commit") return "warning";
  if (k === "rejected" || k === "withdrawn" || k === "commitment_expired") return "danger";
  return "default";
}

export function formatApplicationStatusLabel(status: string): string {
  const k = status.trim().toLowerCase();
  if (!k || k === "unknown") return "Unknown";
  return k.charAt(0).toUpperCase() + k.slice(1);
}

export function placementStatusTextClass(status: StudentPlacementStatus): string {
  return statusTextVariantClass(placementStatusBadgeVariant(status));
}

export function applicationStatusStringTextClass(status: string): string {
  const k = status.trim().toLowerCase();
  if (APPLICATION_STATUSES.has(k)) {
    return applicationStatusTextClass(k as ApplicationStatus);
  }
  return statusTextVariantClass(applicationStatusBadgeVariant(status));
}

/** Maps filter / meta tones to text-only status colors. */
export function filterToneTextClass(tone: "danger" | "warning" | "default"): string {
  const variant: StatusTextVariant =
    tone === "danger" ? "danger" : tone === "warning" ? "warning" : "default";
  return statusTextVariantClass(variant);
}
