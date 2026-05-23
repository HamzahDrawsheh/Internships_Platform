"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const studentLinks = [
  { label: "Dashboard", href: "/dashboard/student", icon: "🏠" },
  { label: "Your supervisor", href: "/dashboard/student/supervisor", icon: "🎓" },
  { label: "Messages", href: "/dashboard/student/messages", icon: "💬" },
  { label: "Browse Internships", href: "/internships", icon: "💼" },
  { label: "Browse Companies", href: "/companies", icon: "🏢" },
  { label: "My Applications", href: "/applications", icon: "📄" },
  { label: "Monthly Reports", href: "/dashboard/student/internship-reports", icon: "📅" },
  { label: "CV Builder", href: "/resume-builder", icon: "📋" },
  { label: "Profile", href: "/profile/student", icon: "👤" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white/90 py-6 backdrop-blur transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900/90">
      <nav className="space-y-1.5 px-4">
        {studentLinks.map((l) => {
          const isActive = pathname === l.href || (l.href !== "/dashboard/student" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                  : "text-gray-800 hover:bg-gray-100 hover:text-purple-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-purple-300"
              }`}
            >
              <span className="text-base" aria-hidden>
                {l.icon}
              </span>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
