"use client";

import { Container } from "@/components/layout/Container";
import { AppBrand } from "@/components/layout/AppBrand";
import { useI18n } from "@/lib/i18n/context";

export function LandingFooter() {
  const { t } = useI18n();

  const platformLinks = [
    { href: "#features", label: t("landing.navFeatures") },
    { href: "#about", label: t("landing.navAbout") },
  ];

  const legalLinks = [
    { href: "#privacy", label: t("legal.privacyBtn") },
    { href: "#terms", label: t("legal.termsBtn") },
  ];

  return (
    <footer className="border-t border-slate-200 bg-white py-12 transition-colors duration-300 dark:border-purple-900/30 dark:bg-slate-950">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="dark:hidden">
              <AppBrand href="/" />
            </div>
            <div className="hidden dark:block">
              <AppBrand href="/" onDark />
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {t("landing.footerTagline")}
            </p>
            <p className="mt-4 text-sm text-slate-500">{t("landing.footerContact")}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-300">
              {t("landing.footerPlatform")}
            </h3>
            <ul className="mt-4 space-y-2">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-600 transition-colors hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-300">
              {t("landing.footerLegal")}
            </h3>
            <ul className="mt-4 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-600 transition-colors hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500 dark:border-slate-800">
          {t("landing.footerRights")}
        </p>
      </Container>
    </footer>
  );
}
