import type { ReactNode } from "react";
import { SupervisorSidebar } from "@/components/layout/SupervisorSidebar";

export default function SupervisorDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-gray-950">
      <SupervisorSidebar />
      <main className="min-w-0 flex-1 py-6 sm:py-8">{children}</main>
    </div>
  );
}
