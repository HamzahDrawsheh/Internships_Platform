"use client";

import { useEffect, useState } from "react";
import { ReportWorkflowStepper } from "./ReportWorkflowStepper";
import { JustFormHeader, type BasicInfoValues } from "./JustFormHeader";
import { AttendancePreview } from "./AttendancePreview";
import { SignaturePad } from "./SignaturePad";
import { Button, Textarea } from "@/components/ui";
import type { AttendanceRow, MonthlyReportRow, WeeklyReportRow } from "@/lib/internship-reports/types";
import { formatIsoDate } from "@/lib/internship-reports/helpers";

const STEPS = ["Basic info", "Assignments", "Weekly work", "Review & submit"];

type Props = {
  report: MonthlyReportRow;
  studentName: string;
  studentId: string;
  department: string;
  employerName: string;
  supervisorName: string;
  assignments: string;
  workSummary: string;
  weeks: WeeklyReportRow[];
  attendance: AttendanceRow[];
  canSubmit: boolean;
  saving: boolean;
  error: string | null;
  saveMessage: string | null;
  onAssignmentsChange: (v: string) => void;
  onWorkSummaryChange: (v: string) => void;
  onBasicInfoChange: (field: keyof BasicInfoValues, value: string) => void;
  onWeeksChange: (weeks: WeeklyReportRow[]) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onSaveSignature: (dataUrl: string) => Promise<void>;
};

export function StudentMonthlyWizard({
  report,
  studentName,
  studentId,
  department,
  employerName,
  supervisorName,
  assignments,
  workSummary,
  weeks,
  attendance,
  canSubmit,
  saving,
  error,
  saveMessage,
  onAssignmentsChange,
  onWorkSummaryChange,
  onBasicInfoChange,
  onWeeksChange,
  onSaveDraft,
  onSubmit,
  onSaveSignature,
}: Props) {
  const [step, setStep] = useState(0);
  const [openWeek, setOpenWeek] = useState(0);

  useEffect(() => {
    document.title = `Month ${report.month_number} Report — InternConnect`;
  }, [report.month_number]);

  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Form steps">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              step === i
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>

      <div className="mb-6">
        <ReportWorkflowStepper report={report} />
      </div>

      {step === 0 && (
        <JustFormHeader
          studentName={studentName}
          studentId={studentId}
          department={department}
          employerName={employerName}
          universitySupervisor={supervisorName}
          monthNumber={report.month_number}
          periodStart={formatIsoDate(report.period_start)}
          periodEnd={formatIsoDate(report.period_end)}
          editable={canSubmit}
          onChange={onBasicInfoChange}
        />
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="text-sm font-semibold">Assignment(s) during this month *</label>
            <Textarea
              rows={4}
              value={assignments}
              disabled={!canSubmit}
              onChange={(e) => onAssignmentsChange(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Summary of assigned work *</label>
            <Textarea
              rows={6}
              value={workSummary}
              disabled={!canSubmit}
              onChange={(e) => onWorkSummaryChange(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Weekly work description</h3>
          {!weeks.length && (
            <p className="text-sm text-amber-700 dark:text-amber-300">Loading weekly sections… refresh if empty.</p>
          )}
          {weeks.map((w, idx) => (
            <div key={w.id} className="rounded-xl border border-gray-200 dark:border-gray-800">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
                onClick={() => setOpenWeek(openWeek === idx ? -1 : idx)}
                aria-expanded={openWeek === idx}
              >
                Week {w.week_number}
                <span className="text-gray-400">{w.description.trim() ? "✓" : "○"}</span>
              </button>
              {openWeek === idx && (
                <div className="border-t border-gray-100 px-4 pb-4 dark:border-gray-800">
                  <Textarea
                    rows={3}
                    value={w.description}
                    disabled={!canSubmit}
                    onChange={(e) => {
                      const next = [...weeks];
                      next[idx] = { ...w, description: e.target.value };
                      onWeeksChange(next);
                    }}
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <AttendancePreview attendance={attendance} periodStart={report.period_start} periodEnd={report.period_end} />
          <div className="rounded-xl border border-gray-200 p-4 text-sm dark:border-gray-800">
            <h3 className="font-semibold">Review your answers</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400"><strong>Name:</strong> {studentName || "—"}</p>
            <p className="mt-1 text-gray-600 dark:text-gray-400"><strong>Student ID:</strong> {studentId || "—"}</p>
            <p className="mt-1 text-gray-600 dark:text-gray-400"><strong>Department:</strong> {department || "—"}</p>
            <p className="mt-1 text-gray-600 dark:text-gray-400"><strong>Employer:</strong> {employerName || "—"}</p>
            <p className="mt-1 text-gray-600 dark:text-gray-400"><strong>Supervisor:</strong> {supervisorName || "—"}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-400"><strong>Assignments:</strong> {assignments || "—"}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-400"><strong>Summary:</strong> {workSummary || "—"}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              <strong>Weeks completed:</strong> {weeks.filter((w) => w.description.trim()).length} / {weeks.length}
            </p>
          </div>
          {canSubmit && <SignaturePad onSave={onSaveSignature} />}
        </div>
      )}

      <div aria-live="polite" className="mt-4 min-h-[1.25rem]">
        {saveMessage && <p className="text-sm text-green-600">{saveMessage}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 && (
          <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
            Continue
          </Button>
        )}
        {canSubmit && (
          <>
            <Button variant="secondary" disabled={saving} onClick={onSaveDraft}>
              Save draft
            </Button>
            {step === STEPS.length - 1 && (
              <Button variant="primary" disabled={saving} onClick={onSubmit}>
                Submit to employer
              </Button>
            )}
          </>
        )}
        {report.status === "approved" && (
          <a href={`/api/internship-reports/${report.id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="secondary">Download PDF</Button>
          </a>
        )}
      </div>
    </div>
  );
}
