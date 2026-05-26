"use client";

import { SidebarNav, type SidebarLink } from "@/components/layout/SidebarNav";

const studentLinks: SidebarLink[] = [
  { labelKey: "nav.dashboard", href: "/dashboard/student", icon: "dashboard" },
  { labelKey: "nav.yourSupervisor", href: "/dashboard/student/supervisor", icon: "academic" },
  { labelKey: "nav.browseInternships", href: "/internships", icon: "briefcase" },
  { labelKey: "nav.browseCompanies", href: "/companies", icon: "building" },
  { labelKey: "nav.myApplications", href: "/applications", icon: "document" },
  { labelKey: "nav.monthlyReports", href: "/dashboard/student/internship-reports", icon: "calendar" },
  { labelKey: "nav.cvBuilder", href: "/resume-builder", icon: "clipboard" },
  { labelKey: "nav.profile", href: "/profile/student", icon: "user" },
];

type Props = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: Props) {
  return (
    <SidebarNav
      links={studentLinks}
      rootHref="/dashboard/student"
      onNavigate={onNavigate}
      reserveAiSlot
    />
  );
}
