"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { ProfileRole } from "@/lib/types";
import { LogoutButton } from "@/components/auth/logout-button";
import { IconBell, IconArrowRightOnRectangle } from "./icons";

function getDashboardHref(role: ProfileRole): string {
  switch (role) {
    case "student":
      return "/dashboard/student";
    case "company":
      return "/dashboard/company";
    case "supervisor":
      return "/dashboard/supervisor";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/dashboard";
  }
}

function getProfileHref(role: ProfileRole): string {
  switch (role) {
    case "student":
      return "/profile/student";
    case "company":
      return "/profile/company";
    default:
      return "/profile/student";
  }
}

const linkClass = (active: boolean) =>
  "rounded-md px-3 py-2 text-sm font-medium transition-colors " +
  (active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900");

export function Navbar() {
  const pathname = usePathname();
  const { user, role, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const dashboardHref = role ? getDashboardHref(role) : "/dashboard";
  const profileHref = role ? getProfileHref(role) : "/profile/student";

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Internships", href: "/internships" },
    ...(user
      ? [
          { label: "Dashboard", href: dashboardHref },
          ...(role === "student" ? [{ label: "Applications", href: "/applications" }] : []),
          { label: "Profile", href: profileHref },
        ]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700"
        >
          InternConnect Jordan
        </Link>

        {/* Center / right: links + actions */}
        <div className="flex flex-1 items-center justify-end gap-1">
          {/* Desktop nav */}
          <div className="hidden items-center gap-0.5 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(pathname === link.href || pathname.startsWith(link.href + "/"))}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {user && (
            <Link
              href="/notifications"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Notifications"
            >
              <IconBell />
            </Link>
          )}

          {/* Auth: Login or account dropdown */}
          {!loading && (
            <div className="relative flex items-center">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAccountOpen(!accountOpen)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    aria-expanded={accountOpen}
                    aria-haspopup="true"
                    aria-label="Account menu"
                  >
                    <span className="hidden sm:inline">{user.email ?? "Account"}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                      {(user.user_metadata?.full_name as string)?.charAt(0) ?? user.email?.charAt(0) ?? "?"}
                    </span>
                  </button>
                  {accountOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        aria-hidden
                        onClick={() => setAccountOpen(false)}
                      />
                      <div
                        className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                        role="menu"
                      >
                        <div className="border-b border-gray-100 px-3 py-2">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {user.user_metadata?.full_name ?? "User"}
                          </p>
                          <p className="truncate text-xs text-gray-500">{user.email}</p>
                        </div>
                        <div className="p-2">
                          <LogoutButton
                            variant="link"
                            className="w-full justify-start gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <IconArrowRightOnRectangle />
                            Logout
                          </LogoutButton>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className={linkClass(pathname === "/auth/login")}
                >
                  Login
                </Link>
              )}
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-50 sm:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-200 bg-white py-2 sm:hidden">
          <div className="flex flex-col gap-0.5 px-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2.5 text-sm font-medium ${
                  pathname === link.href ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <div className="mt-2 border-t border-gray-100 pt-2">
                <LogoutButton />
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
