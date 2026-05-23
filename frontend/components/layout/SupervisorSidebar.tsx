"use client";

import { SidebarNav, type SidebarLink } from "@/components/layout/SidebarNav";

const supervisorLinks: SidebarLink[] = [
  { labelKey: "nav.dashboard", href: "/dashboard/supervisor", icon: "🏠" },
  { labelKey: "nav.students", href: "/supervisor/students", icon: "👥" },
  { labelKey: "nav.applications", href: "/supervisor/reports", icon: "📄" },
  { labelKey: "nav.monthlyReports", href: "/supervisor/internship-reports", icon: "📅" },
  { labelKey: "nav.profile", href: "/supervisor/profile", icon: "👤" },
];

type Props = {
  onNavigate?: () => void;
};

export function SupervisorSidebar({ onNavigate }: Props) {
  return (
    <SidebarNav links={supervisorLinks} rootHref="/dashboard/supervisor" onNavigate={onNavigate} />
  );
}
