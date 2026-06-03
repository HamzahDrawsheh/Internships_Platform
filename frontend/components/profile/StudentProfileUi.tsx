import type { ReactNode } from "react";
import { StudentProfileAvatar } from "@/components/profile/StudentProfileAvatar";
import type { ProfileGender } from "@/lib/profile/gender";

const accentStyles = {
  violet: {
    bar: "from-violet-500 via-purple-500 to-fuchsia-500",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
    ring: "ring-violet-200/60 dark:ring-violet-500/30",
  },
  cyan: {
    bar: "from-cyan-500 via-sky-500 to-blue-500",
    icon: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200",
    ring: "ring-cyan-200/60 dark:ring-cyan-500/30",
  },
  emerald: {
    bar: "from-emerald-500 via-teal-500 to-green-500",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    ring: "ring-emerald-200/60 dark:ring-emerald-500/30",
  },
  amber: {
    bar: "from-amber-500 via-orange-500 to-yellow-500",
    icon: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    ring: "ring-amber-200/60 dark:ring-amber-500/30",
  },
  fuchsia: {
    bar: "from-fuchsia-500 via-pink-500 to-rose-500",
    icon: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
    ring: "ring-fuchsia-200/60 dark:ring-fuchsia-500/30",
  },
} as const;

export type ProfileAccent = keyof typeof accentStyles;

export function ProfileSectionCard({
  title,
  icon,
  accent,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  accent: ProfileAccent;
  children: ReactNode;
  className?: string;
}) {
  const styles = accentStyles[accent];
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className={`h-1 bg-gradient-to-r ${styles.bar}`} />
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${styles.icon} ${styles.ring}`}
          >
            {icon}
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export function ProfileField({
  label,
  value,
  chips,
}: {
  label: string;
  value?: string;
  chips?: string[];
}) {
  const hasChips = chips != null && chips.length > 0;
  const display = value?.trim();

  return (
    <div className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      {hasChips ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{display || "—"}</p>
      )}
    </div>
  );
}

const SKILL_CHIP_CLASS =
  "rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium leading-snug text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300";

/** Neutral skill/course tags for profile read views (no rotating colors). */
export function ColoredChips({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm font-medium text-slate-500 dark:text-slate-400">—</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5" role="list">
      {items.map((item) => (
        <span key={item} role="listitem" className={SKILL_CHIP_CLASS}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function ProfileHero({
  name,
  gender,
  subtitle,
  badge,
  completeness,
  stats,
  action,
}: {
  name: string;
  gender: ProfileGender;
  subtitle?: string;
  badge?: string;
  completeness: number;
  stats: { label: string; value: string }[];
  action?: ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, completeness));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200/50 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 shadow-lg shadow-violet-200/40 dark:border-violet-500/20 dark:shadow-violet-900/30">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <StudentProfileAvatar gender={gender} name={name} />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{name.trim() || "Student"}</h1>
              {subtitle ? <p className="mt-1 text-sm text-violet-100/90">{subtitle}</p> : null}
              {badge ? (
                <span className="mt-3 inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {badge}
                </span>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-violet-100/90">
            <span>Profile completeness</span>
            <span className="tabular-nums text-white">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-white to-fuchsia-200 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {stats.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm"
              >
                <p className="text-lg font-bold tabular-nums text-white">{stat.value}</p>
                <p className="text-xs font-medium text-violet-100/80">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function computeProfileCompleteness(fields: {
  name: string;
  gender: ProfileGender;
  university: string;
  department: string;
  major: string;
  year: string;
  skills: string;
  bio: string;
  gpa: string;
  technicalSkills: string;
  softSkills: string;
  preferredField: string;
  preferredWorkType: string;
  preferredLocation: string;
  availability: string;
  hasCourses: boolean;
  hasCv: boolean;
}): number {
  const checks = [
    Boolean(fields.name.trim()),
    Boolean(fields.gender),
    Boolean(fields.university.trim()),
    Boolean(fields.department.trim()),
    Boolean(fields.major.trim()),
    Boolean(fields.year.trim()),
    Boolean(fields.skills.trim()),
    Boolean(fields.bio.trim()),
    Boolean(fields.gpa.trim()),
    Boolean(fields.technicalSkills.trim()),
    Boolean(fields.softSkills.trim()),
    Boolean(fields.preferredField.trim()),
    Boolean(fields.preferredWorkType),
    Boolean(fields.preferredLocation.trim()),
    Boolean(fields.availability),
    fields.hasCourses,
    fields.hasCv,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}
