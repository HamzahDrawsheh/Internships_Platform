type BasicInfoValues = {
  studentName: string;
  studentId: string;
  department: string;
  employerName: string;
  universitySupervisor: string;
};

type Props = BasicInfoValues & {
  monthNumber: number;
  periodStart: string;
  periodEnd: string;
  editable?: boolean;
  onChange?: (field: keyof BasicInfoValues, value: string) => void;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-60";

export function JustFormHeader({
  studentName,
  studentId,
  department,
  employerName,
  universitySupervisor,
  monthNumber,
  periodStart,
  periodEnd,
  editable,
  onChange,
}: Props) {
  const editableFields: Array<{ key: keyof BasicInfoValues; label: string; value: string }> = [
    { key: "studentName", label: "Student Name", value: studentName },
    { key: "studentId", label: "Student ID", value: studentId },
    { key: "department", label: "Department", value: department },
    { key: "employerName", label: "Employer Name", value: employerName },
    { key: "universitySupervisor", label: "University Supervisor", value: universitySupervisor },
  ];

  return (
    <div className="rounded-xl border-2 border-gray-300 bg-white p-5 dark:border-gray-600 dark:bg-gray-900">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-500">JUST — Monthly Internship Report</p>
      <p className="mt-1 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">Part I — Student Section</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {editableFields.map(({ key, label, value }) => (
          <div key={key} className="border-b border-dashed border-gray-200 pb-2 dark:border-gray-700">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
            {editable && onChange ? (
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                className={inputClass}
              />
            ) : (
              <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{value || "—"}</dd>
            )}
          </div>
        ))}
        <div className="border-b border-dashed border-gray-200 pb-2 dark:border-gray-700">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Month Number</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{monthNumber}</dd>
        </div>
        <div className="border-b border-dashed border-gray-200 pb-2 dark:border-gray-700">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Period From / To</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
            {periodStart} → {periodEnd}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export type { BasicInfoValues };
