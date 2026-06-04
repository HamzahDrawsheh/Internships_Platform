"use client";

import { buildAtsChecklist } from "@/lib/cv/ats-checklist";
import type { CvPdfFields } from "@/lib/cv/types";
import { Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  fields: CvPdfFields;
};

export function CvAtsChecklist({ fields }: Props) {
  const { t } = useI18n();
  const items = buildAtsChecklist(fields);

  return (
    <Card className="mt-4 space-y-3 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("cvBuilder.ats.title")}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden="true"
              className={item.passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
            >
              {item.passed ? "✓" : "✗"}
            </span>
            <span className="text-gray-700 dark:text-slate-300">{t(item.labelKey)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
