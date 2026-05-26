"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { SidebarLogoutItem } from "@/components/layout/SidebarLogoutItem";
import { SidebarNavIcon, type SidebarIconName } from "@/components/layout/SidebarIcon";

export type SidebarLink = {
  labelKey: string;
  href: string;
  icon: SidebarIconName;
};

type SidebarNavProps = {
  links: SidebarLink[];
  /** Dashboard home path — excluded from prefix matching so sub-routes stay inactive on it. */
  rootHref?: string;
  onNavigate?: () => void;
  /** Reserve space at the bottom for the fixed AI Assistant button (student sidebar). */
  reserveAiSlot?: boolean;
};

function isLinkActive(pathname: string, href: string, allHrefs: string[], rootHref?: string): boolean {
  if (pathname === href) return true;
  if (rootHref && href === rootHref) return false;
  if (!pathname.startsWith(`${href}/`)) return false;

  const hasMoreSpecificSibling = allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
  return !hasMoreSpecificSibling;
}

export function SidebarNav({ links, rootHref, onNavigate, reserveAiSlot = false }: SidebarNavProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const allHrefs = links.map((link) => link.href);

  return (
    <nav className={`space-y-1.5 px-4 ${reserveAiSlot ? "pb-24" : ""}`}>
      {links.map((link) => {
        const isActive = isLinkActive(pathname, link.href, allHrefs, rootHref);
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
            <SidebarNavIcon icon={link.icon} active={isActive} />
            {t(link.labelKey)}
          </Link>
        );
      })}
      <Link
        href="/settings/notifications"
        onClick={() => onNavigate?.()}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
          pathname === "/settings/notifications" || pathname.startsWith("/settings/notifications/")
            ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
            : "text-gray-800 hover:bg-gray-100 hover:text-purple-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-purple-300"
        }`}
      >
        <SidebarNavIcon icon="bell" active={pathname === "/settings/notifications" || pathname.startsWith("/settings/notifications/")} />
        {t("nav.notificationSettings")}
      </Link>
      <SidebarLogoutItem onNavigate={onNavigate} />
    </nav>
  );
}
