"use client";

import { SidebarNav, type SidebarLink } from "@/components/layout/SidebarNav";

const adminLinks: SidebarLink[] = [
  { labelKey: "nav.dashboard", href: "/admin/dashboard", icon: "🏠" },
  { labelKey: "nav.onboardingRequests", href: "/admin/onboarding-requests", icon: "📋" },
  { labelKey: "nav.users", href: "/admin/users", icon: "👥" },
  { labelKey: "nav.internships", href: "/admin/internships", icon: "💼" },
  { labelKey: "nav.internshipReports", href: "/admin/internship-reports", icon: "📅" },
  { labelKey: "nav.analytics", href: "/admin/analytics", icon: "📊" },
];

type Props = {
  onNavigate?: () => void;
};

export function AdminSidebar({ onNavigate }: Props) {
  return <SidebarNav links={adminLinks} rootHref="/admin/dashboard" onNavigate={onNavigate} />;
}
