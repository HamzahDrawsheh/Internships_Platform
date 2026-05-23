"use client";

import { cloneElement, isValidElement, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

/** Navbar is fixed h-16; sidebar and main content sit below it. */
export const NAVBAR_HEIGHT_CLASS = "h-16";
export const NAVBAR_OFFSET_CLASS = "top-16";

export const NAVBAR_CLASS =
  "fixed inset-x-0 top-0 z-30 border-b border-slate-200 bg-white shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950";

const SIDEBAR_PANEL_CLASS =
  "fixed start-0 top-16 z-50 flex h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-e border-gray-200 bg-white/95 py-6 backdrop-blur transition-transform duration-300 ease-out dark:border-gray-800 dark:bg-gray-900/95 lg:z-20";

export function RoleShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const sidebarWithClose = isValidElement(sidebar)
    ? cloneElement(sidebar as React.ReactElement<{ onNavigate?: () => void }>, { onNavigate: closeMobile })
    : sidebar;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 transition-colors duration-300 dark:bg-gray-950">
      <div
        className={`sticky ${NAVBAR_OFFSET_CLASS} z-20 flex items-center border-b border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-900/95`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          aria-expanded={mobileOpen}
          aria-controls="role-sidebar"
        >
          <span className="text-base leading-none" aria-hidden>
            ☰
          </span>
          {t("nav.menu")}
        </button>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] lg:hidden"
          aria-label={t("nav.closeMenu")}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        id="role-sidebar"
        className={`${SIDEBAR_PANEL_CLASS} ${
          mobileOpen
            ? "translate-x-0"
            : "pointer-events-none -translate-x-full rtl:translate-x-full lg:pointer-events-auto lg:translate-x-0 rtl:lg:translate-x-0"
        }`}
      >
        {sidebarWithClose}
      </aside>

      <main className="min-w-0 flex-1 py-4 sm:py-6 lg:ms-64 lg:py-8">{children}</main>
    </div>
  );
}
