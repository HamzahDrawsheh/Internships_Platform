import Badge from "@/components/common/Badge";
import type { ApplicationStatus } from "@/lib/types";

const statusVariant: Record<ApplicationStatus, "default" | "info" | "warning" | "success" | "danger"> = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  completed: "info",
};

const statusLabel: Record<ApplicationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export default function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  return <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>;
}
