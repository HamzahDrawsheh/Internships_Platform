export const landingPageClass =
  "min-h-screen bg-white transition-colors duration-300 dark:bg-slate-950 dark:text-white";

export const landingSectionClass =
  "relative overflow-hidden border-t border-slate-200 bg-white transition-colors duration-300 dark:border-purple-900/20 dark:bg-gradient-to-br dark:from-slate-950 dark:via-[#1a1033] dark:to-slate-950";

export const landingGlowTop =
  "pointer-events-none absolute -left-32 top-0 hidden h-64 w-64 rounded-full bg-purple-600/20 blur-3xl dark:block";

export const landingGlowBottom =
  "pointer-events-none absolute -right-24 bottom-0 hidden h-72 w-72 rounded-full bg-indigo-600/15 blur-3xl dark:block";

export const landingSectionTitleClass =
  "text-2xl font-bold text-[#0F172A] sm:text-3xl dark:text-white";

export const landingSectionSubtitleClass =
  "mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400";

export const landingCardClass =
  "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-purple-200 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:backdrop-blur-sm dark:hover:border-purple-500/30 dark:hover:bg-white/[0.07]";

export const landingIconClass =
  "flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-xl ring-1 ring-purple-100 dark:bg-gradient-to-br dark:from-purple-600/30 dark:to-indigo-600/20 dark:ring-purple-500/20";

export const landingStepClass =
  "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-lg font-bold text-white shadow-md shadow-purple-500/25";

export const landingCardTitleClass = "mt-4 font-semibold text-[#0F172A] dark:text-white";

export const landingCardBodyClass =
  "mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400";

export const landingPillarCardClass =
  "flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors duration-300 hover:border-purple-200 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:backdrop-blur-sm dark:hover:border-purple-500/30 dark:hover:bg-white/[0.07]";

export const landingStatCardClass =
  "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none dark:backdrop-blur-sm dark:hover:shadow-lg dark:hover:shadow-purple-900/20";

export const landingBadgeClass =
  "inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:border-purple-500/30 dark:bg-purple-600/20 dark:text-purple-300 dark:ring-1 dark:ring-purple-500/30";

// Legacy aliases — prefer the names above in new code
export const landingDarkSectionClass = landingSectionClass;
export const landingDarkGlowTop = landingGlowTop;
export const landingDarkGlowBottom = landingGlowBottom;
export const landingDarkCardClass = landingCardClass;
export const landingDarkIconClass = landingIconClass;
export const landingDarkStepClass = landingStepClass;
