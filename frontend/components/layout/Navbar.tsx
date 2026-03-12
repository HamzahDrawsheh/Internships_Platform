"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  if (pathname?.startsWith("/auth")) return null;

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Internships", href: "/internships" },
    { label: "Companies", href: "/companies" },
  ];

  return (
    <nav className="border-b border-[#E2E8F0] bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#0F172A]">
            AI Intern Jordan
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden gap-8 sm:flex">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "text-sm font-medium " +
                    (pathname === l.href ? "text-[#7C3AED]" : "text-[#0F172A] hover:text-[#7C3AED]")
                  }
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="rounded-xl px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]">
                Login
              </Link>
              <Link href="/auth/signup" className="rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-[#6D28D9]">
                Get Started
              </Link>
            </div>

            <Link href="/notifications" className="relative rounded-xl p-2 text-[#0F172A] hover:bg-[#F3E8FF]" aria-label="Notifications">
              <span className="text-lg" aria-hidden>🔔</span>
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                className="rounded-xl p-2 text-[#0F172A] hover:bg-[#F3E8FF]"
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
                    className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-[#E2E8F0] bg-white py-2 shadow-lg"
                    role="menu"
                  >
                    <div className="px-4 py-2">
                      <LogoutButton />
                    </div>
                  </div>
                </>
              )}
            </div>

            <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl p-2 sm:hidden" aria-label="Menu">
              <span className="text-xl">☰</span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-[#E2E8F0] py-4 sm:hidden">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="block py-2 text-sm font-medium text-[#0F172A]" onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <Link href="/auth/login" className="block py-2 text-sm text-[#7C3AED]" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link href="/auth/signup" className="block py-2 text-sm font-medium text-[#7C3AED]" onClick={() => setMenuOpen(false)}>Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
