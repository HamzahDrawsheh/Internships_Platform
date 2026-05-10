import { type ReactNode } from "react";

interface TableProps {
  headers: string[];
  children: ReactNode;
  className?: string;
}

export function Table({ headers, children, className = "" }: TableProps) {
  return (
    <div
      className={`overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
        <thead className="bg-gray-50 transition-colors duration-300 dark:bg-slate-800/80">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors duration-300 dark:text-slate-300"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white transition-colors duration-300 dark:divide-slate-800 dark:bg-slate-900">
          {children}
        </tbody>
      </table>
    </div>
  );
}
