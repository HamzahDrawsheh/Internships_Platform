"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

const NAV_LINKS = [
  { href: "#home", labelKey: "landing.navHome", icon: "🏠" },
  { href: "#features", labelKey: "landing.navFeatures", icon: "⚡" },
  { href: "#about", labelKey: "landing.navAbout", icon: "👥" },
  { href: "#privacy", labelKey: "legal.privacyBtn", icon: "🔒" },
  { href: "#terms", labelKey: "legal.termsBtn", icon: "📄" },
] as const;

function NavAnchor({
  href,
  label,
  icon,
  onNavigate,
  className = "",
}: {
  href: string;
  label: string;
  icon?: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <a
      href={href}
      onClick={onNavigate}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-purple-50 hover:text-purple-700 dark:text-slate-300 dark:hover:bg-purple-500/10 dark:hover:text-purple-300 ${className}`}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {label}
    </a>
  );
}

/** Desktop center links: Home, Features, About, Privacy, Terms */
export function LandingHomeNavLinks() {
  const { t } = useI18n();

  return (
    <nav
      className="hidden items-center justify-center gap-1 lg:flex xl:gap-2"
      aria-label="Landing"
    >
      {NAV_LINKS.map((link) => (
        <NavAnchor key={link.href} href={link.href} label={t(link.labelKey)} />
      ))}
    </nav>
  );
}

/** Mobile hamburger + slide-down panel (render in navbar actions column). */
export function LandingHomeNavMobileMenu() {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-50 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
        aria-expanded={menuOpen}
        aria-controls="landing-mobile-nav"
        aria-label={menuOpen ? t("nav.closeMenu") : t("nav.menu")}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="text-lg leading-none">{menuOpen ? "✕" : "☰"}</span>
      </button>

      {menuOpen ? (
        <>
          <div
            className="fixed inset-0 top-16 z-40 bg-black/40 lg:hidden"
            aria-hidden
            onClick={closeMenu}
          />
          <div
            id="landing-mobile-nav"
            className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-4 shadow-lg lg:hidden dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <NavAnchor
                  key={link.href}
                  href={link.href}
                  label={t(link.labelKey)}
                  icon={link.icon}
                  onNavigate={closeMenu}
                  className="w-full justify-start px-4 py-3"
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

/** @deprecated Prefer LandingHomeNavLinks + LandingHomeNavMobileMenu in Navbar */
export function LandingHomeNav() {
  return (
    <>
      <LandingHomeNavLinks />
      <LandingHomeNavMobileMenu />
    </>
  );
}
