"use client";

import { SidebarNav, type SidebarLink } from "@/components/layout/SidebarNav";

const adminLinks: SidebarLink[] = [
  { labelKey: "nav.dashboard", href: "/admin/dashboard", icon: "dashboard" },
  { labelKey: "nav.onboardingRequests", href: "/admin/onboarding-requests", icon: "clipboard" },
  { labelKey: "nav.users", href: "/admin/users", icon: "users" },
  { labelKey: "nav.internships", href: "/admin/internships", icon: "briefcase" },
  { labelKey: "nav.applications", href: "/admin/applications", icon: "document" },
  { labelKey: "nav.feedbacks", href: "/admin/feedbacks", icon: "message" },
  { labelKey: "nav.internshipReports", href: "/admin/internship-reports", icon: "calendar" },
  { labelKey: "nav.analytics", href: "/admin/analytics", icon: "chart" },
];

type Props = {
  onNavigate?: () => void;
};

export function AdminSidebar({ onNavigate }: Props) {
  return <SidebarNav links={adminLinks} rootHref="/admin/dashboard" onNavigate={onNavigate} />;
}
