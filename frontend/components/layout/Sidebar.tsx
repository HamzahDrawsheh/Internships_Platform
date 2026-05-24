"use client";

import { SidebarNav, type SidebarLink } from "@/components/layout/SidebarNav";

const studentLinks: SidebarLink[] = [
  { labelKey: "nav.dashboard", href: "/dashboard/student", icon: "🏠" },
  { labelKey: "nav.yourSupervisor", href: "/dashboard/student/supervisor", icon: "🎓" },
  { labelKey: "nav.browseInternships", href: "/internships", icon: "💼" },
  { labelKey: "nav.browseCompanies", href: "/companies", icon: "🏢" },
  { labelKey: "nav.myApplications", href: "/applications", icon: "📄" },
  { labelKey: "nav.monthlyReports", href: "/dashboard/student/internship-reports", icon: "📅" },
  { labelKey: "nav.cvBuilder", href: "/resume-builder", icon: "📋" },
  { labelKey: "nav.profile", href: "/profile/student", icon: "👤" },
];

type Props = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: Props) {
  return <SidebarNav links={studentLinks} rootHref="/dashboard/student" onNavigate={onNavigate} />;
}
