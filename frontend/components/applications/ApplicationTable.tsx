"use client";

import Link from "next/link";
import Table from "@/components/common/Table";
import { Button } from "@/components/ui";
import ApplicationStatusBadge from "./ApplicationStatusBadge";
import type { Application } from "@/lib/types";

interface ApplicationTableProps {
  applications: Application[];
  showViewAction?: boolean;
  /** Completed placements only: whether training evaluation was already submitted per application id */
  trainingEvaluationSubmittedByAppId?: Record<string, boolean>;
  onEvaluateTraining?: (app: Application) => void;
  onViewTrainingEvaluation?: (applicationId: string) => void;
}

export default function ApplicationTable({
  applications,
  showViewAction = true,
  trainingEvaluationSubmittedByAppId,
  onEvaluateTraining,
  onViewTrainingEvaluation,
}: ApplicationTableProps) {
  if (applications.length === 0) return null;

  const showTrainingEvalActions =
    Boolean(onEvaluateTraining) &&
    Boolean(onViewTrainingEvaluation) &&
    trainingEvaluationSubmittedByAppId != null;

  return (
    <Table
      headers={[
        "Internship",
        "Company",
        "Applied date",
        "Status",
        ...(showViewAction ? ["Actions"] : []),
      ]}
    >
      {applications.map((app) => (
        <tr key={app.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">
            {app.internship_title ?? "—"}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
            {app.company_name ?? "—"}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
            {new Date(app.applied_at).toLocaleDateString()}
          </td>
          <td className="whitespace-nowrap px-4 py-3">
            <ApplicationStatusBadge status={app.status} />
          </td>
          {showViewAction && (
            <td className="max-w-[14rem] px-4 py-3 align-top">
              <div className="flex flex-col gap-2 text-sm">
                <Link href={`/internships/${app.position_id}`}>
                  <Button variant="primary">View listing</Button>
                </Link>
                {showTrainingEvalActions && app.status === "completed" ? (
                  trainingEvaluationSubmittedByAppId[app.id] ? (
                    <button
                      type="button"
                      onClick={() => onViewTrainingEvaluation!(app.id)}
                      className="text-left font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                    >
                      View training evaluation
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEvaluateTraining!(app)}
                      className="text-left font-semibold text-[#7C3AED] underline-offset-2 hover:underline dark:text-violet-400"
                    >
                      Evaluate training
                    </button>
                  )
                ) : null}
              </div>
            </td>
          )}
        </tr>
      ))}
    </Table>
  );
}
