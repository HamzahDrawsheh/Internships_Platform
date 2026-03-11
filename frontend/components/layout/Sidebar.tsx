"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { ProfileRole } from "@/lib/types";
import {
  IconLayoutDashboard,
  IconBriefcase,
  IconDocumentText,
  IconUser,
  IconUsers,
  IconChartBar,
  IconUserGroup,
} from "./icons";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

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

function getSidebarItems(role: ProfileRole | null): NavItem[] {
  if (!role) return [];

  switch (role) {
    case "student":
      return [
        { label: "Dashboard", href: getDashboardHref(role), icon: <IconLayoutDashboard /> },
        { label: "Internships", href: "/internships", icon: <IconBriefcase /> },
        { label: "Applications", href: "/applications", icon: <IconDocumentText /> },
        { label: "Profile", href: getProfileHref(role), icon: <IconUser /> },
      ];
    case "company":
      return [
        { label: "Dashboard", href: getDashboardHref(role), icon: <IconLayoutDashboard /> },
        { label: "Internships", href: "/company/internships", icon: <IconBriefcase /> },
        { label: "Applicants", href: "/company/applicants", icon: <IconUserGroup /> },
        { label: "Profile", href: getProfileHref(role), icon: <IconUser /> },
      ];
    case "supervisor":
      return [
        { label: "Dashboard", href: getDashboardHref(role), icon: <IconLayoutDashboard /> },
        { label: "Students", href: "/supervisor/students", icon: <IconUsers /> },
        { label: "Reports", href: "/supervisor/reports", icon: <IconChartBar /> },
      ];
    case "admin":
      return [
        { label: "Dashboard", href: getDashboardHref(role), icon: <IconLayoutDashboard /> },
        { label: "Users", href: "/admin/users", icon: <IconUsers /> },
        { label: "Internships", href: "/admin/internships", icon: <IconBriefcase /> },
        { label: "Analytics", href: "/admin/analytics", icon: <IconChartBar /> },
      ];
    default:
      return [];
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { role, loading } = useAuth();
  const items = getSidebarItems(role ?? null);

  if (loading || items.length === 0) {
    return (
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-gray-50/50 lg:block" aria-label="Sidebar">
        <nav className="flex h-full flex-col gap-1 p-3">
          <div className="h-9 rounded-md bg-gray-200/80 animate-pulse" />
          <div className="h-9 rounded-md bg-gray-200/80 animate-pulse" />
          <div className="h-9 rounded-md bg-gray-200/80 animate-pulse" />
        </nav>
      </aside>
    );
  }

  return (
    <aside
      className="hidden w-56 shrink-0 border-r border-gray-200 bg-white lg:block"
      aria-label="Sidebar navigation"
    >
      <nav className="flex flex-col gap-0.5 p-3">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                (isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900")
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
