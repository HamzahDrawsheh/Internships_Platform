interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ label, value, className = "" }: StatCardProps) {
  return (
    <div
      className={
        "rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md " +
        className
      }
    >
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{value}</p>
    </div>
  );
}
