"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

type RequestType = "company" | "supervisor";
type RequestStatus = "pending" | "rejected";

interface ApprovalStatusCardProps {
  requestType: RequestType;
  status: RequestStatus;
  adminNotes?: string | null;
  showBackButton?: boolean;
}

export function ApprovalStatusCard({
  requestType,
  status,
  adminNotes = null,
  showBackButton = true,
}: ApprovalStatusCardProps) {
  const roleLabel = requestType === "company" ? "Company" : "Supervisor";
  const isPending = status === "pending";

  return (
    <div
      className={`mt-6 rounded-xl border p-5 text-sm transition-colors duration-300 ${
        isPending
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
      }`}
    >
      <p className="font-semibold">{isPending ? "Pending approval" : "Request rejected"}</p>
      <div className="mt-2 space-y-1">
        <p>
          <span className="font-medium">Request type:</span> {roleLabel}
        </p>
        <p>
          <span className="font-medium">Current status:</span> {status}
        </p>
      </div>

      {isPending ? (
        <p className="mt-2">Your onboarding request is under admin review. You will be notified once reviewed.</p>
      ) : (
        <p className="mt-2">You can update your details below and resubmit when ready.</p>
      )}

      {!isPending && adminNotes && (
        <p className="mt-2">
          <span className="font-medium">Admin notes:</span> {adminNotes}
        </p>
      )}

      {showBackButton && (
        <div className="mt-4">
          <Link href="/dashboard/student">
            <Button variant="secondary">{isPending ? "Go Back" : "Back to Dashboard"}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
