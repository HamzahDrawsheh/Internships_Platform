"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SidebarTogglePortal } from "@/components/layout/SidebarToggle";

/** Navbar is fixed h-16; sidebar and main content sit below it. */
export const NAVBAR_HEIGHT_CLASS = "h-16";
export const NAVBAR_OFFSET_CLASS = "top-16";

export const NAVBAR_CLASS =
  "fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white shadow-sm transition-[background-color,border-color] duration-300 dark:border-slate-800 dark:bg-slate-950";

const SIDEBAR_PANEL_CLASS =
  "fixed start-0 top-16 z-50 flex h-[calc(100vh-4rem)] w-64 shrink-0 flex-col overflow-hidden border-e border-gray-200 bg-white/95 py-6 backdrop-blur transition-transform duration-300 ease-out dark:border-gray-800 dark:bg-gray-900/95 lg:z-20";

const SIDEBAR_STORAGE_KEY = "sidebar-open";

function readInitialSidebarOpen(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored === "true" || stored === "false") {
    return stored === "true";
  }
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function RoleShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(readInitialSidebarOpen());
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 transition-colors duration-300 dark:bg-gray-950">
      <SidebarTogglePortal open={sidebarOpen} onToggle={toggleSidebar} />

      <aside
        id="role-sidebar"
        className={`${SIDEBAR_PANEL_CLASS} ${
          sidebarOpen
            ? "translate-x-0"
            : "pointer-events-none -translate-x-full rtl:translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      <main
        className={`min-w-0 flex-1 py-4 transition-[margin] duration-300 ease-out sm:py-6 lg:py-8 ${
          sidebarOpen ? "lg:ms-64" : "lg:ms-0"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
