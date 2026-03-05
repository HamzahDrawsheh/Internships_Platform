"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Internships", href: "/internships" },
    { label: "Login", href: "/auth/login" },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            InternConnect Jordan
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden gap-1 sm:flex">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "rounded px-3 py-2 text-sm font-medium " +
                    (pathname === l.href ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
                  }
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <Link
              href="/notifications"
              className="relative rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Notifications"
            >
              <span className="text-lg" aria-hidden>🔔</span>
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                className="rounded p-2 text-gray-600 hover:bg-gray-100"
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
                    className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                    role="menu"
                  >
                    <div className="px-4 py-2">
                      <LogoutButton />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="sm:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded p-2 text-gray-600 hover:bg-gray-100"
                aria-label="Menu"
              >
                <span className="text-lg" aria-hidden>☰</span>
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-gray-200 py-2 sm:hidden">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
