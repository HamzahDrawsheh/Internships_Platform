import type { EmployerEvaluationRow } from "@/lib/internship-reports/types";

const REQUIRED_FIELDS: { key: keyof EmployerEvaluationRow; label: string }[] = [
  { key: "relations_with_others", label: "Relations with Others" },
  { key: "ability_to_learn", label: "Ability to Learn" },
  { key: "dependability", label: "Dependability" },
  { key: "overall_performance", label: "Over-All Performance" },
  { key: "work_ethics", label: "Working Ethics" },
  { key: "attitudes", label: "Attitudes" },
  { key: "quality_of_work", label: "Quality of Work" },
  { key: "attendance_record", label: "Attendance Record" },
];

type Props = {
  evaluation: EmployerEvaluationRow | null;
  emptyMessage?: string;
};

export function EmployerEvaluationReadOnly({
  evaluation,
  emptyMessage = "Employer evaluation not submitted yet.",
}: Props) {
  if (!evaluation) {
    return <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>;
  }

  return (
    <dl className="mt-4 space-y-3 text-sm">
      {REQUIRED_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
          <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
            {(evaluation[key] as string | null | undefined)?.trim() || "—"}
          </dd>
        </div>
      ))}
      {evaluation.evaluator_name?.trim() ? (
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Evaluator name</dt>
          <dd className="mt-0.5 text-gray-900 dark:text-gray-100">{evaluation.evaluator_name}</dd>
        </div>
      ) : null}
      {evaluation.advancement_traits?.trim() ? (
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Traits that may help or hinder advancement
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-gray-900 dark:text-gray-100">
            {evaluation.advancement_traits}
          </dd>
        </div>
      ) : null}
      {evaluation.additional_remarks?.trim() ? (
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Additional remarks</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-gray-900 dark:text-gray-100">
            {evaluation.additional_remarks}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
