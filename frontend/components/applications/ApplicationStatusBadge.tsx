import Badge from "@/components/common/Badge";
import type { ApplicationStatus } from "@/lib/types";

const statusVariant: Record<
  ApplicationStatus,
  "default" | "info" | "warning" | "success" | "danger"
> = {
  pending: "warning",
  accepted_pending_commit: "warning",
  accepted: "success",
  rejected: "danger",
  completed: "info",
  commitment_expired: "danger",
  withdrawn: "default",
};

const statusLabel: Record<ApplicationStatus, string> = {
  pending: "Pending",
  accepted_pending_commit: "Awaiting your confirmation",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
  commitment_expired: "Offer expired",
  withdrawn: "Withdrawn",
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export default function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  return <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>;
}
