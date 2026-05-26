"use client";

import type { ReactNode } from "react";
import type { SidebarIconName } from "@/components/layout/SidebarIcon";
import { useDashboardCyclicSync } from "@/components/dashboard/DashboardCyclicSync";
import { WidgetSidebarIcon } from "@/components/dashboard/WidgetSidebarIcon";

export type CyclicSlide = {
  id: string;
  content: ReactNode;
};

type Props = {
  title: string;
  subtitle?: string;
  iconName: SidebarIconName;
  slides: CyclicSlide[];
  emptyState?: ReactNode;
  className?: string;
  accentClass?: string;
  dotClass?: string;
};

export function CyclicWidget({
  title,
  subtitle,
  iconName,
  slides,
  emptyState,
  className = "",
  accentClass = "from-violet-500/10 to-indigo-500/10 border-violet-200/60 dark:border-violet-500/25",
  dotClass = "bg-violet-600 dark:bg-violet-400",
}: Props) {
  const { cycleStep, fadeKey, setCycleStep } = useDashboardCyclicSync();
  const count = slides.length;
  const index = count > 0 ? ((cycleStep % count) + count) % count : 0;

  return (
    <article
      className={`flex h-full min-h-[240px] flex-col overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm transition-all duration-500 hover:shadow-lg ${accentClass} ${className}`}
    >
      <div className="flex items-start gap-3 border-b border-inherit bg-white/60 px-4 py-3.5 backdrop-blur-sm dark:bg-slate-900/50">
        <WidgetSidebarIcon name={iconName} active />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {count > 1 ? (
          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300">
            {index + 1}/{count}
          </span>
        ) : null}
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden p-4">
        {count === 0 ? (
          emptyState ?? (
            <p className="text-sm text-gray-500 dark:text-slate-400">Nothing to show yet.</p>
          )
        ) : (
          <div
            key={fadeKey}
            className="cyclic-slide-enter flex min-h-0 flex-1 flex-col"
          >
            {slides[index]?.content}
          </div>
        )}
      </div>

      {count > 1 ? (
        <div className="flex justify-center gap-1 border-t border-inherit px-4 py-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`${title} slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setCycleStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? `w-5 ${dotClass}` : "w-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600"
              }`}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
