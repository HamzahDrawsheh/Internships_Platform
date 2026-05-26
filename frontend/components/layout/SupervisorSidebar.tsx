"use client";

import { SidebarNav, type SidebarLink } from "@/components/layout/SidebarNav";

const supervisorLinks: SidebarLink[] = [
  { labelKey: "nav.dashboard", href: "/dashboard/supervisor", icon: "dashboard" },
  { labelKey: "nav.browseCompanies", href: "/supervisor/companies", icon: "building" },
  { labelKey: "nav.students", href: "/supervisor/students", icon: "users" },
  { labelKey: "nav.applications", href: "/supervisor/reports", icon: "document" },
  { labelKey: "nav.monthlyReports", href: "/supervisor/internship-reports", icon: "calendar" },
  { labelKey: "nav.profile", href: "/supervisor/profile", icon: "user" },
];

type Props = {
  onNavigate?: () => void;
};

export function SupervisorSidebar({ onNavigate }: Props) {
  return (
    <SidebarNav links={supervisorLinks} rootHref="/dashboard/supervisor" onNavigate={onNavigate} />
  );
}
