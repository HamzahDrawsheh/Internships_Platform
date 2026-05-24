"use client";

import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/messages";

type LanguageToggleProps = {
  className?: string;
};

const optionBase =
  "relative z-10 min-w-[3.25rem] rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950";

export function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { locale, setLocale, t } = useI18n();

  const select = (next: Locale) => {
    if (locale !== next) setLocale(next);
  };

  return (
    <div
      data-i18n-skip
      className={`inline-flex rounded-full border border-slate-200 bg-slate-100/90 p-1 shadow-inner dark:border-slate-700 dark:bg-slate-900/90 ${className}`}
      role="group"
      aria-label={t("common.language")}
    >
      <button
        type="button"
        onClick={() => select("ar")}
        className={`${optionBase} ${
          locale === "ar"
            ? "bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white shadow-md shadow-purple-500/30"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
        aria-pressed={locale === "ar"}
        aria-label={t("common.switchToArabic")}
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => select("en")}
        className={`${optionBase} ${
          locale === "en"
            ? "bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white shadow-md shadow-purple-500/30"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
        aria-pressed={locale === "en"}
        aria-label={t("common.switchToEnglish")}
      >
        EN
      </button>
    </div>
  );
}
