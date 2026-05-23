import { buildPhrasePairs, getMessage, type Locale } from "@/lib/i18n/messages";

let exactMapCache: Map<string, string> | null = null;

export const REPORT_STATUS_LABELS_EN: Record<string, string> = {
  locked: "Locked",
  unlocked: "Ready to submit",
  pending_student: "Draft in progress",
  pending_employer: "Awaiting employer",
  pending_supervisor: "Awaiting supervisor",
  approved: "Approved",
  rejected: "Needs revision",
  overdue: "Overdue",
};

export const REPORT_STATUS_LABELS_AR: Record<string, string> = {
  locked: "مقفل",
  unlocked: "جاهز للتقديم",
  pending_student: "مسودة قيد الإعداد",
  pending_employer: "بانتظار الشركة",
  pending_supervisor: "بانتظار المشرف",
  approved: "معتمد",
  rejected: "يحتاج مراجعة",
  overdue: "متأخر",
};

const INTERNSHIP_STATUS_AR: Record<string, string> = {
  active: "نشط",
  completed: "مكتمل",
  cancelled: "ملغى",
  pending_supervisor_approval: "بانتظار موافقة المشرف",
};

type DynamicRule = {
  re: RegExp;
  translate: (match: RegExpMatchArray) => string;
};

const dynamicRules: DynamicRule[] = [
  { re: /^Complete Month (\d+)$/i, translate: (m) => `أكمل الشهر ${m[1]}` },
  { re: /^Revise Month (\d+)$/i, translate: (m) => `راجع الشهر ${m[1]}` },
  { re: /^Month (\d+) submitted$/i, translate: (m) => `تم تقديم الشهر ${m[1]}` },
  { re: /^Evaluate (.+)'s Month (\d+)$/i, translate: (m) => `قيّم الشهر ${m[2]} للمتدرب ${m[1]}` },
  { re: /^Approve Month (\d+) for (.+)$/i, translate: (m) => `اعتمد الشهر ${m[1]} للطالب ${m[2]}` },
  { re: /^(\d+) day overdue$/i, translate: (m) => `متأخر ${m[1]} يوم` },
  { re: /^(\d+) days overdue$/i, translate: (m) => `متأخر ${m[1]} أيام` },
  { re: /^Due today$/i, translate: () => "مستحق اليوم" },
  { re: /^Due tomorrow$/i, translate: () => "مستحق غداً" },
  { re: /^Due in (\d+) day$/i, translate: (m) => `مستحق خلال ${m[1]} يوم` },
  { re: /^Due in (\d+) days$/i, translate: (m) => `مستحق خلال ${m[1]} أيام` },
  { re: /^(\d+)\/(\d+) months approved$/i, translate: (m) => `${m[1]}/${m[2]} أشهر معتمدة` },
  { re: /^(\d+) monthly reports need attention\.$/i, translate: (m) => `${m[1]} تقارير شهرية تحتاج متابعة.` },
  { re: /^1 monthly report needs your attention\.$/i, translate: () => "تقرير شهري واحد يحتاج متابعة." },
  { re: /^(\d+) monthly reports need your attention\.$/i, translate: (m) => `${m[1]} تقارير شهرية تحتاج متابعة.` },
  { re: /^(\d+)% complete$/i, translate: (m) => `${m[1]}% مكتمل` },
  { re: /^(\d+)\/(\d+) monthly reports approved$/i, translate: (m) => `${m[1]}/${m[2]} تقارير شهرية معتمدة` },
  { re: /^(\d+) of (\d+) months left$/i, translate: (m) => `${m[1]} من ${m[2]} أشهر متبقية` },
  { re: /^(\d+) days left$/i, translate: (m) => `${m[1]} يوم متبقٍ` },
  { re: /^(\d+) weeks$/i, translate: (m) => `${m[1]} أسابيع` },
  { re: /^(\d+) days$/i, translate: (m) => `${m[1]} أيام` },
  { re: /^report due — open monthly reports$/i, translate: () => "تقرير مستحق — افتح التقارير الشهرية" },
  { re: /^reports due — open monthly reports$/i, translate: () => "تقارير مستحقة — افتح التقارير الشهرية" },
  { re: /^Month (\d+)$/i, translate: (m) => `الشهر ${m[1]}` },
  { re: /^Opens (.+)$/i, translate: (m) => `يفتح ${m[1]}` },
  { re: /^Month (\d+) must be approved first$/i, translate: (m) => `يجب اعتماد الشهر ${m[1]} أولاً` },
  {
    re: /^Status: (.+)$/i,
    translate: (m) => {
      const key = m[1].trim().toLowerCase().replace(/\s+/g, "_");
      return `الحالة: ${INTERNSHIP_STATUS_AR[key] ?? m[1]}`;
    },
  },
];

export function buildExactTranslationMap(): Map<string, string> {
  if (exactMapCache) return exactMapCache;

  const map = new Map<string, string>();
  for (const [en, ar] of buildPhrasePairs()) {
    if (!map.has(en)) map.set(en, ar);
  }

  for (const [status, label] of Object.entries(REPORT_STATUS_LABELS_EN)) {
    map.set(label, REPORT_STATUS_LABELS_AR[status] ?? label);
  }

  exactMapCache = map;
  return map;
}

function applyDynamicRules(text: string, locale: Locale): string | null {
  if (locale !== "ar") return null;
  const trimmed = text.trim();
  for (const rule of dynamicRules) {
    const match = trimmed.match(rule.re);
    if (match) return rule.translate(match);
  }
  return null;
}

/** Exact + dynamic translation for a single English UI string. */
export function localizeText(text: string, locale: Locale): string {
  if (!text || locale === "en") return text;

  const dynamic = applyDynamicRules(text, locale);
  if (dynamic) return dynamic;

  const map = buildExactTranslationMap();
  const trimmed = text.trim();
  const exact = map.get(trimmed);
  if (exact) {
    if (trimmed === text) return exact;
    return text.replace(trimmed, exact);
  }

  return text;
}

export function tKey(locale: Locale, key: string): string {
  return getMessage(locale, key);
}
