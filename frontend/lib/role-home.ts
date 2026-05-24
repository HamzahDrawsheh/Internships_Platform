import type { ProfileRole } from "@/lib/types";

/** Dashboard path for an authenticated user role (matches middleware + /dashboard redirect). */
export function getRoleDashboardPath(role: ProfileRole | string | null | undefined): string {
  switch (role) {
    case "student":
      return "/dashboard/student";
    case "company":
      return "/dashboard/company";
    case "supervisor":
      return "/dashboard/supervisor";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/onboarding";
  }
}
