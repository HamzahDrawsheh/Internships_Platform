"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { CompanySidebar } from "@/components/layout/CompanySidebar";
import { SupervisorSidebar } from "@/components/layout/SupervisorSidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import StudentAssistantChat from "@/components/chat/StudentAssistantChat";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRole } from "@/lib/types";

function sidebarForRole(role: ProfileRole | null) {
  switch (role) {
    case "admin":
      return <AdminSidebar />;
    case "company":
      return <CompanySidebar />;
    case "supervisor":
      return <SupervisorSidebar />;
    case "student":
    default:
      return <Sidebar />;
  }
}

export function SettingsRoleLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<ProfileRole | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setRole((data?.role as ProfileRole) ?? "student");
    })();
  }, []);

  return (
    <RoleShell sidebar={sidebarForRole(role)}>
      {children}
      {role === "student" ? <StudentAssistantChat /> : null}
    </RoleShell>
  );
}
