"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const roleResolvedRef = useRef(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
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
    };

    resolveHomeHref();
  }, []);

  const isHomePage = pathname === "/";
  const adminEntryHref = "/auth/login?next=%2Fdashboard%2Fadmin";

  if (pathname?.startsWith("/auth")) return null;

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-end">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              aria-label={themeMounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span aria-hidden>{themeMounted && theme === "dark" ? "☀️" : "🌙"}</span>
              <span className="hidden md:inline">{themeMounted && theme === "dark" ? "Light" : "Dark"}</span>
            </button>

            {isHomePage && (
              <div className="flex items-center gap-3">
                <Link
                  href={adminEntryHref}
                  className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 transition-colors duration-300 hover:bg-purple-100 dark:border-purple-400/40 dark:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/20"
                >
                  Admin Portal
                </Link>
                <Link href="/auth/login" className="rounded-xl px-4 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
                  Login
                </Link>
                <Link href="/auth/signup" className="rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-[#6D28D9]">
                  Get Started
                </Link>
              </div>
            )}

            {!isHomePage && (
              <Link href="/notifications" className="relative rounded-xl p-2 text-slate-900 transition-colors duration-300 hover:bg-[#F3E8FF] dark:text-yellow-400 dark:hover:bg-slate-800" aria-label="Notifications">
                <span className="text-lg" aria-hidden>🔔</span>
              </Link>
            )}

            {!isHomePage && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="rounded-xl p-2 text-slate-900 transition-colors duration-300 hover:bg-[#F3E8FF] dark:text-white dark:hover:bg-slate-800"
                  aria-expanded={accountOpen}
                  aria-haspopup="true"
                  aria-label="Account menu"
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
                      <div className="px-4 py-2">
                        {isAuthenticated ? (
                          <LogoutButton />
                        ) : (
                          <Link
                            href="/auth/login"
                            onClick={() => setAccountOpen(false)}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors duration-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                          >
                            Login
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
      </div>
    </nav>
  );
}
