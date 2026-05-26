import type { ApplicationStatus } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Days a student has to confirm after a company accepts their application. */
export const COMMITMENT_DEADLINE_DAYS = 3;

export const COMMITMENT_PENDING_STATUS = "accepted_pending_commit" as const;

export type CommitmentPendingStatus = typeof COMMITMENT_PENDING_STATUS;

export function isCommitmentPendingStatus(status: string): status is CommitmentPendingStatus {
  return status === COMMITMENT_PENDING_STATUS;
}

export function computeCommitmentDeadlineIso(from = new Date()): string {
  const deadline = new Date(from);
  deadline.setDate(deadline.getDate() + COMMITMENT_DEADLINE_DAYS);
  return deadline.toISOString();
}

export function normalizeApplicationStatus(raw: unknown): ApplicationStatus {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (
    s === "pending" ||
    s === "accepted_pending_commit" ||
    s === "accepted" ||
    s === "rejected" ||
    s === "completed" ||
    s === "commitment_expired" ||
    s === "withdrawn"
  ) {
    return s;
  }
  return "pending";
}

export function canCompanyTransitionStatus(
  current: string,
  next: ApplicationStatus | "accepted"
): boolean {
  if (current === "pending" && (next === "accepted" || next === "rejected")) return true;
  if (current === COMMITMENT_PENDING_STATUS && next === "rejected") return true;
  if (current === "accepted" && next === "completed") return true;
  return false;
}

/** Company UI sends "accepted"; stored as pending student commitment. */
export function buildCompanyStatusPatch(
  nextStatus: ApplicationStatus | "accepted",
  scheduleWeeks: number | null
): Record<string, unknown> {
  if (nextStatus === "accepted") {
    return {
      status: COMMITMENT_PENDING_STATUS,
      accepted_at: new Date().toISOString(),
      commitment_deadline: computeCommitmentDeadlineIso(),
      training_end_date: null,
      committed_at: null,
    };
  }

  if (nextStatus === "rejected") {
    return {
      status: "rejected",
      accepted_at: null,
      commitment_deadline: null,
      training_end_date: null,
      committed_at: null,
    };
  }

  if (nextStatus === "completed") {
    return { status: "completed" };
  }

  return { status: nextStatus };
}

export function commitmentTimeRemainingMs(deadlineIso: string | null | undefined): number | null {
  if (!deadlineIso) return null;
  const deadline = new Date(deadlineIso).getTime();
  if (!Number.isFinite(deadline)) return null;
  return deadline - Date.now();
}

export function formatCommitmentCountdown(deadlineIso: string | null | undefined): string | null {
  const remaining = commitmentTimeRemainingMs(deadlineIso);
  if (remaining == null) return null;
  if (remaining <= 0) return "Expired";

  const totalHours = Math.floor(remaining / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function studentHasActiveCommitment(statuses: string[]): boolean {
  return statuses.some((s) => s === "accepted");
}

/** Student is enrolled in an active training placement (confirmed commitment). */
export function studentIsEnrolledInTraining(statuses: string[]): boolean {
  return studentHasActiveCommitment(statuses);
}

export const ENROLLED_TRAINING_STATUS = "accepted" as const;

export async function fetchStudentEnrolledInTraining(
  supabase: SupabaseClient,
  studentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("applications")
    .select("id")
    .eq("student_id", studentId)
    .eq("status", ENROLLED_TRAINING_STATUS)
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}

export function studentHasPendingCommitment(statuses: string[]): boolean {
  return statuses.some((s) => s === COMMITMENT_PENDING_STATUS);
}
