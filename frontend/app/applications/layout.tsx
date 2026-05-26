import type { ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Sidebar } from "@/components/layout/Sidebar";

export default function ApplicationsLayout({ children }: { children: ReactNode }) {
  return <RoleShell sidebar={<Sidebar />}>{children}</RoleShell>;
}
