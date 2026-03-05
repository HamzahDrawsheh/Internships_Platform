import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile?.role as ProfileRole) ?? null;
  const home = role ? roleHome[role] : "/onboarding";
  redirect(home);
}
