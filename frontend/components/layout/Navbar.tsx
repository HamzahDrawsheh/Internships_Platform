"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { MessagesNavbarButton } from "@/components/messaging/MessagesNavbarButton";
import NotificationsDropdown from "@/components/layout/NotificationsDropdown";
import { LandingHomeNav } from "@/components/landing/LandingHomeNav";
import { AppBrand } from "@/components/layout/AppBrand";
import { NAVBAR_CLASS, NAVBAR_HEIGHT_CLASS } from "@/components/layout/RoleShell";
import { useI18n } from "@/lib/i18n/context";
import { LogoutButton } from "@/components/auth/logout-button";
import { getRoleDashboardPath } from "@/lib/role-home";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRole } from "@/lib/types";

export default function Navbar() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [homeHref, setHomeHref] = useState("/onboarding");
  const [themeMounted, setThemeMounted] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const roleResolvedRef = useRef(false);
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    if (roleResolvedRef.current) return;
    roleResolvedRef.current = true;

    const supabase = createClient();

    const resolveHomeHref = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      // Guests are a normal state; do not surface AuthSessionMissingError noise.
      if (sessionError) {
        const isMissingSession =
          sessionError.name === "AuthSessionMissingError" ||
          sessionError.message?.toLowerCase().includes("auth session missing");
        if (!isMissingSession) {
          console.error("navbar getSession error:", sessionError);
        }
        setIsAuthenticated(false);
        return;
      }

      if (!session?.user) {
        setIsAuthenticated(false);
        return;
      }
      setIsAuthenticated(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      setHomeHref(getRoleDashboardPath(profile?.role as ProfileRole | undefined));
    };

    resolveHomeHref();
  }, []);

  const isHomePage = pathname === "/";
  const adminEntryHref = "/auth/login?next=%2Fdashboard%2Fadmin";
  const brandHref = isHomePage ? "/" : isAuthenticated ? homeHref : "/";

  if (pathname?.startsWith("/auth")) return null;

  return (
    <>
      <nav className={NAVBAR_CLASS}>
        <div className={`flex ${NAVBAR_HEIGHT_CLASS} w-full items-center gap-2 sm:gap-4`}>
        <AppBrand href={brandHref} className="shrink-0 pl-2 sm:pl-3" />

        {isHomePage ? <LandingHomeNav /> : <div className="hidden flex-1 lg:block" aria-hidden />}

        <div className="flex shrink-0 items-center gap-2 pr-2 sm:gap-3 sm:pr-3 lg:pr-4">
            <LanguageToggle />

            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              aria-label={themeMounted && theme === "dark" ? t("common.switchToLight") : t("common.switchToDark")}
            >
              <span aria-hidden>{themeMounted && theme === "dark" ? "☀️" : "🌙"}</span>
              <span className="hidden md:inline">{themeMounted && theme === "dark" ? t("common.light") : t("common.dark")}</span>
            </button>

            {!isHomePage && isAuthenticated && (
              <Link
                href={homeHref}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                title={t("nav.home")}
                aria-label={t("nav.home")}
              >
                <span className="text-base" aria-hidden>
                  🏠
                </span>
                <span className="hidden md:inline">{t("nav.home")}</span>
              </Link>
            )}

            {isHomePage && (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href={adminEntryHref}
                  className="hidden rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 transition-colors duration-300 hover:bg-purple-100 sm:inline-flex dark:border-purple-400/40 dark:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/20"
                >
                  {t("nav.adminPortal")}
                </Link>
                <Link href="/auth/login" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 sm:px-4 dark:border dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
                  {t("nav.login")}
                </Link>
                <Link href="/auth/signup" className="rounded-xl bg-[#7C3AED] px-3 py-2 text-sm font-medium text-white shadow-md hover:bg-[#6D28D9] sm:px-4">
                  {t("nav.getStarted")}
                </Link>
              </div>
            )}

            {!isHomePage && <MessagesNavbarButton enabled={isAuthenticated} />}

            {!isHomePage && <NotificationsDropdown enabled={isAuthenticated} />}

            {!isHomePage && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="rounded-xl p-2 text-slate-900 transition-colors duration-300 hover:bg-[#F3E8FF] dark:text-white dark:hover:bg-slate-800"
                  aria-expanded={accountOpen}
                  aria-haspopup="true"
                  aria-label={t("common.accountMenu")}
                >
                  <span className="text-lg" aria-hidden>👤</span>
                </button>
                {accountOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setAccountOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-2 shadow-lg transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900"
                      role="menu"
                    >
                      {isAuthenticated && (
                        <div className="px-2 py-1">
                          <Link
                            href="/settings/notifications"
                            onClick={() => setAccountOpen(false)}
                            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                            role="menuitem"
                          >
                            {t("nav.notificationSettings")}
                          </Link>
                        </div>
                      )}
                      <div className="px-4 py-2">
                        {isAuthenticated ? (
                          <LogoutButton />
                        ) : (
                          <Link
                            href="/auth/login"
                            onClick={() => setAccountOpen(false)}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                          >
                            {t("nav.login")}
                          </Link>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
      <div className={NAVBAR_HEIGHT_CLASS} aria-hidden />
    </>
  );
}
