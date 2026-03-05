import Badge from "@/components/common/Badge";
import type { ApplicationStatus } from "@/lib/types";

const statusVariant: Record<ApplicationStatus, "default" | "info" | "warning" | "success" | "danger"> = {
  submitted: "default",
  under_review: "info",
  accepted: "success",
  rejected: "danger",
};

const statusLabel: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export default function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  return <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>;
}
