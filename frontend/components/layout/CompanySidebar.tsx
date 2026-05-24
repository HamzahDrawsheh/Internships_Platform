"use client";

import { SidebarNav, type SidebarLink } from "@/components/layout/SidebarNav";

const companyLinks: SidebarLink[] = [
  { labelKey: "nav.dashboard", href: "/dashboard/company", icon: "🏠" },
  { labelKey: "nav.myInternshipPosts", href: "/company/internships", icon: "💼" },
  { labelKey: "nav.createInternship", href: "/company/internships/new", icon: "➕" },
  { labelKey: "nav.applications", href: "/company/applications", icon: "📄" },
  { labelKey: "nav.traineeReports", href: "/company/internship-reports", icon: "📅" },
  { labelKey: "nav.companyProfile", href: "/profile/company", icon: "👤" },
];

type Props = {
  onNavigate?: () => void;
};

export function CompanySidebar({ onNavigate }: Props) {
  return <SidebarNav links={companyLinks} rootHref="/dashboard/company" onNavigate={onNavigate} />;
}
