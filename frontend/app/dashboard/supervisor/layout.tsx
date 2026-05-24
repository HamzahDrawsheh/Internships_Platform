import type { ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";
import { SupervisorSidebar } from "@/components/layout/SupervisorSidebar";

export default function SupervisorDashboardLayout({ children }: { children: ReactNode }) {
  return <RoleShell sidebar={<SupervisorSidebar />}>{children}</RoleShell>;
}
