"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Onboarding Requests", href: "/admin/onboarding-requests" },
  { label: "Users", href: "/admin/users" },
  { label: "Internships", href: "/admin/internships" },
  { label: "Internship Reports", href: "/admin/internship-reports" },
  { label: "Analytics", href: "/admin/analytics" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white/90 py-6 backdrop-blur transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900/90">
      <nav className="space-y-1.5 px-4">
        {adminLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                  : "text-gray-800 hover:bg-gray-100 hover:text-purple-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-purple-300"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
