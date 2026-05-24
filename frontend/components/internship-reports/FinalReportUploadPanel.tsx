"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { MAX_FINAL_REPORT_BYTES } from "@/lib/internship-reports/constants";
import { allMonthlyReportsApproved, formatIsoDate, internshipPeriodComplete } from "@/lib/internship-reports/helpers";
import type { FinalReportRow, MonthlyReportRow } from "@/lib/internship-reports/types";

type Props = {
  reports: MonthlyReportRow[];
  endDate: string;
  internshipStatus: string;
  finalReport: FinalReportRow | null;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
};

export function FinalReportUploadPanel({
  reports,
  endDate,
  internshipStatus,
  finalReport,
  uploading,
  onUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const allApproved = allMonthlyReportsApproved(reports);
  const periodDone = internshipPeriodComplete(endDate);
  const unlocked = (internshipStatus === "active" || internshipStatus === "completed") && allApproved && periodDone;

  const handleFile = useCallback(
    async (file: File) => {
      setLocalError(null);
      if (file.type !== "application/pdf") {
        setLocalError("Only PDF files are allowed.");
        return;
      }
      if (file.size > MAX_FINAL_REPORT_BYTES) {
        setLocalError("File exceeds 50MB limit.");
        return;
      }
      setProgress(10);
      await onUpload(file);
      setProgress(100);
      setTimeout(() => setProgress(0), 1500);
    },
    [onUpload]
  );

  const checklist = [
    { ok: allApproved, label: `All ${reports.length} monthly reports approved` },
    { ok: periodDone, label: "Internship end date passed" },
    { ok: Boolean(finalReport), label: "Final PDF uploaded" },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
      <h3 className="font-semibold text-gray-900 dark:text-white">Final internship report</h3>
      <p className="mt-1 text-sm text-gray-500">Upload your comprehensive final report (PDF only).</p>

      <ul className="mt-4 space-y-2">
        {checklist.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-sm">
            <span aria-hidden>{c.ok ? "✅" : "○"}</span>
            <span className={c.ok ? "text-green-700 dark:text-green-400" : "text-gray-500"}>{c.label}</span>
          </li>
        ))}
      </ul>

      {finalReport ? (
        <p className="mt-4 text-sm text-green-700 dark:text-green-300">
          Uploaded {formatIsoDate(finalReport.uploaded_at)} · {finalReport.status}
        </p>
      ) : unlocked ? (
        <div
          className={`mt-4 rounded-xl border-2 border-dashed p-8 text-center transition ${
            dragOver ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" : "border-gray-300 dark:border-gray-600"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) void handleFile(f);
          }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Drag & drop PDF here, or</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button variant="primary" className="mt-3" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "Uploading…" : "Choose PDF"}
          </Button>
          {progress > 0 && (
            <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div className="h-full bg-purple-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">Complete the checklist above to unlock upload.</p>
      )}

      {localError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {localError}
        </p>
      )}
    </div>
  );
}
