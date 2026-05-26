"use client";

import { formatWorkArrangementLabel } from "@/lib/recommendations/location-prefs";
import { useI18n } from "@/lib/i18n/context";

const BADGE_CLASSES: Record<string, string> = {
  remote:
    "bg-emerald-100 text-emerald-800 ring-emerald-200/70 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/30",
  onsite:
    "bg-orange-100 text-orange-800 ring-orange-200/70 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-500/30",
  hybrid:
    "bg-violet-100 text-violet-800 ring-violet-200/70 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-500/30",
  default:
    "bg-sky-100 text-sky-800 ring-sky-200/70 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-500/30",
};

function badgeClasses(raw: string | null | undefined): string {
  const key = (raw ?? "").trim().toLowerCase();
  if (key.includes("remote")) return BADGE_CLASSES.remote;
  if (key.includes("hybrid")) return BADGE_CLASSES.hybrid;
  if (key.includes("on-site") || key.includes("onsite")) return BADGE_CLASSES.onsite;
  return BADGE_CLASSES.default;
}

type Props = {
  location: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
};

export function WorkArrangementBadge({ location, className = "", size = "md" }: Props) {
  const { t } = useI18n();
  const rawLabel = formatWorkArrangementLabel(location);
  if (!rawLabel) return null;

  const normalized = (location ?? "").trim().toLowerCase();
  let label = rawLabel;
  if (normalized.includes("remote")) label = t("browse.workRemote");
  else if (normalized.includes("hybrid")) label = t("browse.workHybrid");
  else if (normalized.includes("on-site") || normalized.includes("onsite")) label = t("browse.workOnsite");

  const sizeClass =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ring-1 ${sizeClass} ${badgeClasses(location)} ${className}`}
    >
      <svg className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} shrink-0 opacity-80`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </span>
  );
}
