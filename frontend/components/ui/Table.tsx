import { type ReactNode } from "react";

interface TableProps {
  headers: string[];
  children: ReactNode;
  className?: string;
}

export function Table({ headers, children, className = "" }: TableProps) {
  return (
    <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
      <thead className="bg-gray-50">
        <tr>
          {headers.map((header, i) => (
            <th
              key={i}
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {children}
      </tbody>
    </table>
  );
}
