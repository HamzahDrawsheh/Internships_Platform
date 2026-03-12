interface DashboardCardProps {
  title: string;
  value: string | number;
  className?: string;
}

export function DashboardCard({ title, value, className = "" }: DashboardCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      <p className="text-sm font-medium text-[#0F172A]/70">{title}</p>
      <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
    </div>
  );
}
