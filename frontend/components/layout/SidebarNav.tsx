"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { SidebarLogoutItem } from "@/components/layout/SidebarLogoutItem";

export type SidebarLink = {
  labelKey: string;
  href: string;
  icon: string;
};

type SidebarNavProps = {
  links: SidebarLink[];
  /** Dashboard home path — excluded from prefix matching so sub-routes stay inactive on it. */
  rootHref?: string;
  onNavigate?: () => void;
};

function isLinkActive(pathname: string, href: string, rootHref?: string): boolean {
  if (pathname === href) return true;
  if (rootHref && href === rootHref) return false;
  return pathname.startsWith(`${href}/`) || pathname.startsWith(href);
}

export function SidebarNav({ links, rootHref, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="space-y-1.5 overflow-y-auto px-4">
      {links.map((link) => {
        const isActive = isLinkActive(pathname, link.href, rootHref);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => onNavigate?.()}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
              isActive
                ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                : "text-gray-800 hover:bg-gray-100 hover:text-purple-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-purple-300"
            }`}
          >
            <span className="text-base" aria-hidden>
              {link.icon}
            </span>
            {t(link.labelKey)}
          </Link>
        );
      })}
      <SidebarLogoutItem onNavigate={onNavigate} />
    </nav>
  );
}
