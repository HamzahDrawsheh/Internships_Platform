"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  getMessage,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/i18n/messages";
import { localizeText } from "@/lib/i18n/translate";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
  lt: (text: string) => string;
  dir: "ltr" | "rtl";
  isArabic: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG"]);
const SKIP_SELECTOR = "[data-i18n-skip], [contenteditable='true']";
const SITE_NAVBAR_ID = "site-navbar";

function isInSkippedRegion(element: Element | null): boolean {
  if (!element) return true;
  if (element.closest(SKIP_SELECTOR)) return true;
  if (element.closest(`#${SITE_NAVBAR_ID}`)) return true;
  return false;
}

function applyDocumentLocale(locale: Locale) {
  const html = document.documentElement;
  html.lang = locale;
  html.dir = locale === "ar" ? "rtl" : "ltr";
}

function restoreDomTranslations(root: ParentNode) {
  root.querySelectorAll("[data-i18n-applied]").forEach((element) => {
    if (isInSkippedRegion(element)) return;
    const original = element.getAttribute("data-i18n-applied");
    if (original == null) return;

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.placeholder = original;
    } else {
      element.textContent = original;
    }
    element.removeAttribute("data-i18n-applied");
  });
}

function applyDomTranslations(root: ParentNode) {
  root.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((element) => {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return;
    if (isInSkippedRegion(element)) return;

    const original = element.getAttribute("data-i18n-applied") ?? element.placeholder;
    const translated = localizeText(original, "ar");
    if (translated !== original) {
      if (!element.hasAttribute("data-i18n-applied")) {
        element.setAttribute("data-i18n-applied", original);
      }
      element.placeholder = translated;
    }
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName) || isInSkippedRegion(parent)) {
        return NodeFilter.FILTER_REJECT;
      }
      const text = node.textContent?.trim();
      if (!text) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;
    const raw = textNode.textContent ?? "";
    const translated = localizeText(raw, "ar");

    if (parent && translated !== raw) {
      if (!parent.hasAttribute("data-i18n-applied")) {
        parent.setAttribute("data-i18n-applied", raw);
      }
      textNode.textContent = translated;
    }

    current = walker.nextNode();
  }
}

function DomTranslator({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const run = () => {
      if (locale === "en") {
        restoreDomTranslations(document.body);
        return;
      }
      applyDomTranslations(document.body);
    };

    run();

    const schedule = () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(run, 80);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [locale, pathname]);

  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate locale from localStorage after mount */
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "ar" || stored === "en") {
      setLocaleState(stored);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!ready) return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    applyDocumentLocale(locale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
    });
  }, [locale, ready]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((current) => (current === "en" ? "ar" : "en"));
  }, []);

  const t = useCallback((key: string) => getMessage(locale, key), [locale]);
  const lt = useCallback((text: string) => localizeText(text, locale), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      lt,
      dir: locale === "ar" ? "rtl" : "ltr",
      isArabic: locale === "ar",
    }),
    [locale, setLocale, toggleLocale, t, lt]
  );

  return (
    <I18nContext.Provider value={value}>
      {ready ? <DomTranslator locale={locale} /> : null}
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
