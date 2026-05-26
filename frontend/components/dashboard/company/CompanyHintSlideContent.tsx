"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import type { CompanyHintSlide } from "@/lib/dashboard/company-dashboard-hints";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  slide: CompanyHintSlide;
  primaryCta?: boolean;
};

export function CompanyHintSlideContent({ slide, primaryCta = false }: Props) {
  const { t } = useI18n();
  const badgeText = t(`dashboard.company.widgets.badges.${slide.badge}`);

  const badgeClass =
    slide.badge === "urgent"
      ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200"
      : slide.badge === "onTrack"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
        : "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";

  return (
    <div className="flex h-full flex-col">
      <span
        className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
      >
        {badgeText}
      </span>
      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{slide.title}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{slide.body}</p>
      <Link href={slide.href} className="mt-auto pt-4">
        <Button variant={primaryCta ? "primary" : "secondary"} className="w-full rounded-xl text-xs">
          {slide.cta}
        </Button>
      </Link>
    </div>
  );
}
