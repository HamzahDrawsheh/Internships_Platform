"use client";

import { getWorkflowSteps, type WorkflowSteps } from "@/lib/internship-reports/workflow";
import type { MonthlyReportRow } from "@/lib/internship-reports/types";
import { useI18n } from "@/lib/i18n/context";

function StepDot({ state, label }: { state: WorkflowSteps[keyof WorkflowSteps]; label: string }) {
  const styles = {
    done: "bg-green-500 text-white",
    current: "bg-purple-600 text-white ring-2 ring-purple-300",
    pending: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
    skipped: "bg-gray-100 text-gray-400",
  };
  const icon = state === "done" ? "✓" : state === "current" ? "●" : "○";
  return (
    <div className="flex flex-col items-center gap-1 min-w-[4.5rem]">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${styles[state]}`} aria-hidden>
        {icon}
      </span>
      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 text-center">{label}</span>
    </div>
  );
}

type Props = {
  report: MonthlyReportRow;
  compact?: boolean;
};

export function ReportWorkflowStepper({ report, compact }: Props) {
  const { lt } = useI18n();
  const steps = getWorkflowSteps(report.status);
  const studentLabel = lt("Student");
  const employerLabel = lt("Employer");
  const supervisorLabel = lt("Supervisor");

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500" aria-label={lt(`Month ${report.month_number} workflow`)}>
        <span className={steps.student === "done" ? "text-green-600" : ""}>
          {studentLabel} {steps.student === "done" ? "✓" : "○"}
        </span>
        <span aria-hidden>→</span>
        <span className={steps.employer === "done" ? "text-green-600" : steps.employer === "current" ? "text-purple-600 font-medium" : ""}>
          {employerLabel} {steps.employer === "done" ? "✓" : "○"}
        </span>
        <span aria-hidden>→</span>
        <span className={steps.supervisor === "done" ? "text-green-600" : steps.supervisor === "current" ? "text-purple-600 font-medium" : ""}>
          {supervisorLabel} {steps.supervisor === "done" ? "✓" : "○"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4" role="list" aria-label={lt(`Month ${report.month_number} approval workflow`)}>
      <StepDot state={steps.student} label={studentLabel} />
      <div className="h-px w-6 sm:w-10 bg-gray-200 dark:bg-gray-700" aria-hidden />
      <StepDot state={steps.employer} label={employerLabel} />
      <div className="h-px w-6 sm:w-10 bg-gray-200 dark:bg-gray-700" aria-hidden />
      <StepDot state={steps.supervisor} label={supervisorLabel} />
    </div>
  );
}
