"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const studentLinks = [
  { label: "Dashboard", href: "/dashboard/student" },
  { label: "Browse Internships", href: "/internships" },
  { label: "Browse Companies", href: "/companies" },
  { label: "My Applications", href: "/applications" },
  { label: "Profile", href: "/profile/student" },
  { label: "Notifications", href: "/notifications" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 border-r border-[#E2E8F0] bg-white py-6">
      <nav className="space-y-1 px-4">
        {studentLinks.map((l) => {
          const isActive = pathname === l.href || (l.href !== "/dashboard/student" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium ${
                isActive ? "bg-[#F3E8FF] text-[#7C3AED]" : "text-[#0F172A] hover:bg-[#F8FAFC] hover:text-[#7C3AED]"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
