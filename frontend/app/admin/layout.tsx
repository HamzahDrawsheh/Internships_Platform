import type { ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleShell sidebar={<AdminSidebar />}>{children}</RoleShell>;
}
