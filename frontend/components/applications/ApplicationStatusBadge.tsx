import { applicationStatusTextClass } from "@/lib/ui/status-text";
import type { ApplicationStatus } from "@/lib/types";

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
  className?: string;
  /** Override default English label (e.g. i18n on detail pages). */
  label?: string;
};

export default function ApplicationStatusBadge({
  status,
  className = "",
  label,
}: ApplicationStatusBadgeProps) {
  return (
    <span
      className={`text-xs ${applicationStatusTextClass(status)} ${className}`.trim()}
      role="status"
    >
      {label ?? statusLabel[status]}
    </span>
  );
}
