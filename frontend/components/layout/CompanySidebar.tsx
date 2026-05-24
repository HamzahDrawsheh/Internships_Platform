"use client";

import { SidebarNav, type SidebarLink } from "@/components/layout/SidebarNav";

const companyLinks: SidebarLink[] = [
  { labelKey: "nav.dashboard", href: "/dashboard/company", icon: "dashboard" },
  { labelKey: "nav.myInternshipPosts", href: "/company/internships", icon: "briefcase" },
  { labelKey: "nav.createInternship", href: "/company/internships/new", icon: "plus" },
  { labelKey: "nav.applications", href: "/company/applications", icon: "document" },
  { labelKey: "nav.traineeReports", href: "/company/internship-reports", icon: "calendar" },
  { labelKey: "nav.companyProfile", href: "/profile/company", icon: "user" },
];

type Props = {
  onNavigate?: () => void;
};

export function CompanySidebar({ onNavigate }: Props) {
  return <SidebarNav links={companyLinks} rootHref="/dashboard/company" onNavigate={onNavigate} />;
}
