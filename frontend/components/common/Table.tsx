interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export default function Table({ headers, children, className = "" }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-gray-200 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
        <thead className="bg-gray-50 transition-colors duration-300 dark:bg-slate-800">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors duration-300 dark:text-slate-300">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white transition-colors duration-300 dark:divide-slate-800 dark:bg-slate-900">{children}</tbody>
      </table>
    </div>
  );
}
