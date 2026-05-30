import Link from "next/link";
import type { ReactNode } from "react";

export type MetricStatTone = "purple" | "amber" | "green" | "sky" | "indigo" | "teal";

const TONE_STYLES: Record<
  MetricStatTone,
  {
    card: string;
    label: string;
    value: string;
    accent: string;
    glow: string;
    iconWrap: string;
    icon: string;
  }
> = {
  purple: {
    card: "border-purple-200/70 ring-purple-100/60 dark:border-purple-500/25 dark:ring-purple-500/15",
    label: "text-purple-700/90 dark:text-purple-300/90",
    value: "text-purple-900 dark:text-purple-100",
    accent: "from-purple-500 to-violet-600",
    glow: "bg-purple-200/50 dark:bg-purple-500/20",
    iconWrap:
      "bg-purple-100 text-purple-700 ring-purple-200/80 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/25",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  amber: {
    card: "border-amber-200/70 ring-amber-100/60 dark:border-amber-500/25 dark:ring-amber-500/15",
    label: "text-amber-800/90 dark:text-amber-300/90",
    value: "text-yellow-900 dark:text-amber-100",
    accent: "from-amber-500 to-yellow-600",
    glow: "bg-amber-200/50 dark:bg-amber-500/20",
    iconWrap:
      "bg-yellow-100 text-amber-800 ring-amber-200/80 dark:bg-yellow-500/15 dark:text-amber-300 dark:ring-amber-500/25",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  green: {
    card: "border-green-200/70 ring-green-100/60 dark:border-green-500/25 dark:ring-green-500/15",
    label: "text-green-800/90 dark:text-green-300/90",
    value: "text-green-900 dark:text-green-100",
    accent: "from-emerald-500 to-green-600",
    glow: "bg-green-200/50 dark:bg-green-500/20",
    iconWrap:
      "bg-green-100 text-green-800 ring-green-200/80 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/25",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  sky: {
    card: "border-sky-200/70 ring-sky-100/60 dark:border-sky-500/25 dark:ring-sky-500/15",
    label: "text-sky-800/90 dark:text-sky-300/90",
    value: "text-sky-900 dark:text-sky-100",
    accent: "from-sky-500 to-blue-600",
    glow: "bg-sky-200/50 dark:bg-sky-500/20",
    iconWrap:
      "bg-sky-100 text-sky-800 ring-sky-200/80 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  indigo: {
    card: "border-indigo-200/70 ring-indigo-100/60 dark:border-indigo-500/25 dark:ring-indigo-500/15",
    label: "text-indigo-800/90 dark:text-indigo-300/90",
    value: "text-indigo-900 dark:text-indigo-100",
    accent: "from-indigo-500 to-violet-600",
    glow: "bg-indigo-200/50 dark:bg-indigo-500/20",
    iconWrap:
      "bg-indigo-100 text-indigo-800 ring-indigo-200/80 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25",
    icon: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824 2.998 12.078 12.078 0 01.665-6.479L12 14z",
  },
  teal: {
    card: "border-teal-200/70 ring-teal-100/60 dark:border-teal-500/25 dark:ring-teal-500/15",
    label: "text-teal-800/90 dark:text-teal-300/90",
    value: "text-teal-900 dark:text-teal-100",
    accent: "from-teal-500 to-emerald-600",
    glow: "bg-teal-200/50 dark:bg-teal-500/20",
    iconWrap:
      "bg-teal-100 text-teal-800 ring-teal-200/80 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/25",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
};

/** Maps legacy Tailwind tint classes to metric tones. */
export function metricToneFromCardClass(cardClass: string): MetricStatTone {
  if (cardClass.includes("yellow")) return "amber";
  if (cardClass.includes("green")) return "green";
  if (cardClass.includes("sky") || cardClass.includes("blue")) return "sky";
  if (cardClass.includes("indigo")) return "indigo";
  if (cardClass.includes("teal")) return "teal";
  return "purple";
}

function StatIcon({ path }: { path: string }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export type MetricStatCardProps = {
  label: string;
  value: number | string;
  tone: MetricStatTone;
  href?: string;
  className?: string;
};

export function MetricStatCard({ label, value, tone, href, className = "" }: MetricStatCardProps) {
  const style = TONE_STYLES[tone];

  const inner = (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${style.accent}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${style.glow}`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent opacity-90 dark:from-slate-900/40"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${style.label}`}>{label}</p>
          <p className={`mt-3 text-3xl font-bold tabular-nums tracking-tight sm:text-[2rem] ${style.value}`}>
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105 ${style.iconWrap}`}
        >
          <StatIcon path={style.icon} />
        </div>
      </div>
    </>
  );

  const cardClass = `group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900/90 ${style.card} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`block ${cardClass}`}>
        {inner}
      </Link>
    );
  }

  return <article className={cardClass}>{inner}</article>;
}

export function MetricStatGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>{children}</section>;
}
