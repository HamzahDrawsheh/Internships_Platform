import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth";
import type { ProfileRole } from "@/lib/types";

const roleHome: Record<ProfileRole, string> = {
  student: "/dashboard/student",
  company: "/dashboard/company",
  supervisor: "/dashboard/supervisor",
  admin: "/admin/dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const role = await getCurrentUserRole();
  const home = role ? roleHome[role] : "/onboarding";
  redirect(home);
}
