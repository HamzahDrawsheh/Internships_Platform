"use client";

type Props = {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
};

export function ProgressDonutChart({
  percent,
  size = 108,
  stroke = 10,
  label,
  sublabel,
  className = "",
}: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="dashboard-donut-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-emerald-100 dark:text-emerald-900/50"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#dashboard-donut-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
          {clamped}%
        </span>
        {label ? (
          <span className="mt-0.5 max-w-[5rem] text-[10px] font-medium leading-tight text-gray-500 dark:text-slate-400">
            {label}
          </span>
        ) : null}
        {sublabel ? (
          <span className="mt-0.5 text-[9px] text-gray-400 dark:text-slate-500">{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}
