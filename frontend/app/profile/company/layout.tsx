import type { ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";
import { CompanySidebar } from "@/components/layout/CompanySidebar";

export default function CompanyProfileLayout({ children }: { children: ReactNode }) {
  return <RoleShell sidebar={<CompanySidebar />}>{children}</RoleShell>;
}
