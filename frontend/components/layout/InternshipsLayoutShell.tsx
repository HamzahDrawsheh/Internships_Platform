"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SupervisorSidebar } from "@/components/layout/SupervisorSidebar";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRole } from "@/lib/types";

export function InternshipsLayoutShell({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<ProfileRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setRole("student");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!cancelled) setRole((profile?.role as ProfileRole) ?? "student");
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const sidebar = role === "supervisor" ? <SupervisorSidebar /> : <Sidebar />;

  return <RoleShell sidebar={sidebar}>{children}</RoleShell>;
}
