"use client";

import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import {
  COMMITMENT_PENDING_STATUS,
  formatCommitmentCountdown,
} from "@/lib/applications/commitment";
import type { Application } from "@/lib/types";

type Props = {
  applications: Application[];
  onCommitted: () => void | Promise<void>;
};

export function ApplicationCommitmentPanel({ applications, onCommitted }: Props) {
  const pending = useMemo(
    () =>
      applications.filter(
        (app) =>
          app.status === COMMITMENT_PENDING_STATUS &&
          (app.commitment_deadline == null ||
            new Date(app.commitment_deadline).getTime() > Date.now())
      ),
    [applications]
  );

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (pending.length === 0) return null;

  const handleConfirm = async (applicationId: string) => {
    setConfirmingId(applicationId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/applications/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; internshipTitle?: string };

      if (!res.ok || !body.ok) {
        const code = body.error ?? "commit_failed";
        if (code === "deadline_passed") {
          setError("This offer has expired. You can no longer confirm it.");
        } else if (code === "already_committed") {
          setError("You have already committed to another internship.");
        } else {
          setError("Unable to confirm commitment. Please try again.");
        }
        await onCommitted();
        return;
      }

      setSuccess(
        body.internshipTitle
          ? `You committed to "${body.internshipTitle}". Your other applications were withdrawn.`
          : "Commitment confirmed. Your other applications were withdrawn."
      );
      await onCommitted();
    } catch {
      setError("Unable to confirm commitment. Please try again.");
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <Card className="mb-6 border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 dark:border-amber-500/30 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/30">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-lg text-white shadow-md">
          ⏳
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Confirm your internship commitment
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            You have been accepted — confirm within 3 days to secure your spot. Once you commit, all
            other applications will be withdrawn automatically.
          </p>

          {error ? (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
              {success}
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            {pending.map((app) => {
              const countdown = formatCommitmentCountdown(app.commitment_deadline);
              return (
                <div
                  key={app.id}
                  className="rounded-xl border border-amber-200/70 bg-white/90 p-4 dark:border-amber-500/25 dark:bg-slate-900/70"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {app.internship_title ?? "Internship"}
                      </p>
                      {app.company_name ? (
                        <p className="text-sm text-slate-600 dark:text-slate-400">{app.company_name}</p>
                      ) : null}
                      {countdown ? (
                        <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                          {countdown}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      onClick={() => void handleConfirm(app.id)}
                      disabled={confirmingId != null}
                      className="shrink-0 rounded-full bg-amber-600 px-5 hover:bg-amber-700"
                    >
                      {confirmingId === app.id ? "Confirming…" : "Confirm commitment"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
