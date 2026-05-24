"use client";

import {
  EVAL_ABILITY_TO_LEARN,
  EVAL_ATTENDANCE,
  EVAL_ATTITUDES,
  EVAL_DEPENDABILITY,
  EVAL_OVERALL,
  EVAL_QUALITY,
  EVAL_RELATIONS,
  EVAL_WORK_ETHICS,
} from "@/lib/internship-reports/constants";
import { suggestAttendanceRating } from "@/lib/internship-reports/workflow";

type EvalState = {
  relations_with_others: string;
  ability_to_learn: string;
  dependability: string;
  overall_performance: string;
  work_ethics: string;
  attitudes: string;
  quality_of_work: string;
  attendance_record: string;
  advancement_traits: string;
  additional_remarks: string;
  evaluator_name: string;
};

type Props = {
  value: EvalState;
  onChange: (next: EvalState) => void;
  disabled?: boolean;
  attendancePct?: number;
};

function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  name: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-gray-900 dark:text-white">{label} *</legend>
      {hint && <p className="text-xs text-purple-700 dark:text-purple-300">{hint}</p>}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <label key={opt} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={opt}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(opt)}
                className="sr-only"
              />
              <span
                className={`inline-block rounded-lg border px-3 py-2 text-xs font-medium transition focus-within:ring-2 focus-within:ring-purple-400 ${
                  selected
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-purple-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                } ${disabled ? "opacity-60" : ""}`}
              >
                {opt}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export type { EvalState };

export function EmployerEvaluationForm({ value, onChange, disabled, attendancePct }: Props) {
  const set = (key: keyof EvalState, v: string) => onChange({ ...value, [key]: v });
  const attendanceHint =
    typeof attendancePct === "number"
      ? `Live attendance: ${attendancePct}%. Suggested rating: "${suggestAttendanceRating(attendancePct)}"`
      : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 dark:border-purple-900/40 dark:bg-purple-950/20">
        <h3 className="font-semibold text-purple-900 dark:text-purple-200">Part II — Employer Evaluation</h3>
        <p className="mt-1 text-sm text-purple-800/80 dark:text-purple-300/80">
          Complete after the student submits their monthly report. All categories are required.
        </p>
        {typeof attendancePct === "number" && (
          <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-gray-800 dark:bg-gray-900/80 dark:text-gray-200">
            Student attendance this month: <strong>{attendancePct}%</strong>
            {attendanceHint && (
              <span className="block text-xs font-normal text-purple-700 dark:text-purple-300">{attendanceHint}</span>
            )}
          </p>
        )}
      </div>

      <RadioGroup label="Relations with Others" name="relations" options={EVAL_RELATIONS} value={value.relations_with_others} onChange={(v) => set("relations_with_others", v)} disabled={disabled} />
      <RadioGroup label="Ability to Learn" name="ability" options={EVAL_ABILITY_TO_LEARN} value={value.ability_to_learn} onChange={(v) => set("ability_to_learn", v)} disabled={disabled} />
      <RadioGroup label="Dependability" name="dependability" options={EVAL_DEPENDABILITY} value={value.dependability} onChange={(v) => set("dependability", v)} disabled={disabled} />
      <RadioGroup label="Over-All Performance" name="overall" options={EVAL_OVERALL} value={value.overall_performance} onChange={(v) => set("overall_performance", v)} disabled={disabled} />
      <RadioGroup label="Working Ethics" name="ethics" options={EVAL_WORK_ETHICS} value={value.work_ethics} onChange={(v) => set("work_ethics", v)} disabled={disabled} />
      <RadioGroup label="Attitudes" name="attitudes" options={EVAL_ATTITUDES} value={value.attitudes} onChange={(v) => set("attitudes", v)} disabled={disabled} />
      <RadioGroup label="Quality of Work" name="quality" options={EVAL_QUALITY} value={value.quality_of_work} onChange={(v) => set("quality_of_work", v)} disabled={disabled} />
      <RadioGroup label="Attendance Record" name="attendance" options={EVAL_ATTENDANCE} value={value.attendance_record} onChange={(v) => set("attendance_record", v)} disabled={disabled} hint={attendanceHint} />

      <div>
        <label className="text-sm font-semibold text-gray-900 dark:text-white">Evaluator name</label>
        <input
          type="text"
          value={value.evaluator_name}
          disabled={disabled}
          onChange={(e) => set("evaluator_name", e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-900 dark:text-white">What traits may help or hinder advancement? (optional)</label>
        <textarea
          rows={3}
          value={value.advancement_traits}
          disabled={disabled}
          onChange={(e) => set("advancement_traits", e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-900 dark:text-white">Additional remarks (optional)</label>
        <textarea
          rows={3}
          value={value.additional_remarks}
          disabled={disabled}
          onChange={(e) => set("additional_remarks", e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
    </div>
  );
}

export const emptyEvalState: EvalState = {
  relations_with_others: "",
  ability_to_learn: "",
  dependability: "",
  overall_performance: "",
  work_ethics: "",
  attitudes: "",
  quality_of_work: "",
  attendance_record: "",
  advancement_traits: "",
  additional_remarks: "",
  evaluator_name: "",
};
