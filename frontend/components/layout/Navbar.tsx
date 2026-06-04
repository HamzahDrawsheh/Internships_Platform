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
import { SidebarIcon } from "@/components/layout/SidebarIcon";
import {
  NAVBAR_CLASS,
  NAVBAR_HEIGHT_CLASS,
  NAVBAR_SPACER_WITH_SEARCH_CLASS,
} from "@/components/layout/RoleShell";
import { useI18n } from "@/lib/i18n/context";
import { getRoleDashboardPath } from "@/lib/role-home";
import { createClient } from "@/lib/supabase/client";
import { RoleNavbarSearch } from "@/components/layout/RoleNavbarSearch";
import { NAV_ICON_BUTTON_CLASS } from "@/components/layout/navControlStyles";
import type { ProfileRole } from "@/lib/types";

export default function Navbar() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<ProfileRole | null>(null);
  const [homeHref, setHomeHref] = useState("/onboarding");
  const [themeMounted, setThemeMounted] = useState(false);
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
        setUserRole(null);
        return;
      }

      if (!session?.user) {
        setIsAuthenticated(false);
        setUserRole(null);
        return;
      }
      setIsAuthenticated(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      const role = profile?.role as ProfileRole | undefined;
      setUserRole(role ?? null);
      setHomeHref(getRoleDashboardPath(role));
    };

    resolveHomeHref();
  }, []);

  const isHomePage = pathname === "/";
  const adminEntryHref = "/auth/login?next=%2Fdashboard%2Fadmin";
  const brandHref = isHomePage ? "/" : isAuthenticated ? homeHref : "/";

  if (pathname?.startsWith("/auth")) return null;

  const showNavbarSearch = !isHomePage && isAuthenticated && Boolean(userRole);

  return (
    <>
      <nav
        id="site-navbar"
        data-i18n-skip
        dir="ltr"
        className={`${NAVBAR_CLASS} ${showNavbarSearch ? "" : NAVBAR_HEIGHT_CLASS}`}
      >
        <div
          className={
            showNavbarSearch
              ? "grid w-full grid-cols-[minmax(0,1fr)_auto] grid-rows-[4rem_auto] md:grid-cols-[auto_minmax(0,1fr)_auto] md:grid-rows-1 md:items-center md:gap-x-4"
              : `flex ${NAVBAR_HEIGHT_CLASS} w-full items-center gap-2 sm:gap-4`
          }
        >
        <div className="flex h-16 shrink-0 items-center gap-2 ps-2 sm:gap-3 sm:ps-3 md:col-start-1 md:row-start-1">
          <div id="navbar-sidebar-toggle-slot" className="flex items-center" />
          <AppBrand href={brandHref} className="shrink-0" />
        </div>

        {isHomePage ? (
          <div className="col-span-2 flex h-16 items-center md:col-span-1 md:col-start-2">
            <LandingHomeNav />
          </div>
        ) : showNavbarSearch ? (
          <div className="col-span-2 min-w-0 border-t border-slate-200 px-3 pb-3 pt-2 dark:border-slate-800 md:col-span-1 md:col-start-2 md:row-start-1 md:border-t-0 md:px-0 md:pb-0 md:pt-0">
            <RoleNavbarSearch key={userRole} role={userRole!} />
          </div>
        ) : (
          <div className="hidden flex-1 lg:block" aria-hidden />
        )}

        <div className="flex h-16 shrink-0 items-center justify-end gap-2 pe-2 sm:gap-3 sm:pe-3 md:col-start-3 md:row-start-1 lg:pe-4">
            <LanguageToggle />

            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={NAV_ICON_BUTTON_CLASS}
              aria-label={themeMounted && theme === "dark" ? t("common.switchToLight") : t("common.switchToDark")}
            >
              <SidebarIcon name={themeMounted && theme === "dark" ? "sun" : "moon"} />
              <span className="hidden md:inline">{themeMounted && theme === "dark" ? t("common.light") : t("common.dark")}</span>
            </button>

            {!isHomePage && isAuthenticated && (
              <Link
                href={homeHref}
                className={NAV_ICON_BUTTON_CLASS}
                title={t("nav.home")}
                aria-label={t("nav.home")}
              >
                <SidebarIcon name="dashboard" />
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
          </div>
        </div>
      </nav>
      <div
        className={showNavbarSearch ? NAVBAR_SPACER_WITH_SEARCH_CLASS : NAVBAR_HEIGHT_CLASS}
        aria-hidden
      />
    </>
  );
}
