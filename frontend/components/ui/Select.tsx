import { type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  options: SelectOption[];
  error?: string;
  id?: string;
}

export function Select({ label, options, error, id, className = "", ...props }: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s/g, "-") : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={`block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-100 sm:text-sm ${error ? "border-red-500" : "border-gray-300"} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={selectId ? `${selectId}-error` : undefined} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
