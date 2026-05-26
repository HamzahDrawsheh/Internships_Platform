import type { ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Sidebar } from "@/components/layout/Sidebar";
import StudentAssistantChat from "@/components/chat/StudentAssistantChat";

export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RoleShell sidebar={<Sidebar />}>
      {children}
      <StudentAssistantChat />
    </RoleShell>
  );
}
