import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isValidDepartment, normalizeDepartmentAlias } from "@/lib/departments";
import type { ProfileRole } from "@/lib/types";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/signup", "/auth/verify"];
const AUTH_PATHS = ["/auth/login", "/auth/signup"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => p === pathname) || pathname === "/auth" || pathname.startsWith("/auth/");
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function getRoleHome(role: ProfileRole | null): string {
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

function isCompanyOrSupervisorProtectedPath(pathname: string): boolean {
  return (
    pathname === "/dashboard/company" ||
    pathname.startsWith("/company") ||
    pathname === "/dashboard/supervisor" ||
    pathname.startsWith("/supervisor")
  );
}

function getOnboardingStatePath(requestedRole: "company" | "supervisor" | null): string | null {
  if (requestedRole === "company") return "/onboarding/company";
  if (requestedRole === "supervisor") return "/onboarding/supervisor";
  return null;
}

function isIntentRole(value: unknown): value is "company" | "supervisor" {
  return value === "company" || value === "supervisor";
}

function hasRequiredOnboardingPayload(
  requestedRole: "company" | "supervisor" | null,
  payload: unknown
): boolean {
  if (!requestedRole || !payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;

  if (requestedRole === "company") {
    return typeof record.company_name === "string" && record.company_name.trim().length > 0;
  }

  const department = typeof record.department === "string" ? record.department.trim() : "";
  const departmentOk =
    department.length > 0 && (isValidDepartment(department) || normalizeDepartmentAlias(department) !== null);
  return (
    typeof record.full_name === "string" &&
    record.full_name.trim().length > 0 &&
    typeof record.university === "string" &&
    record.university.trim().length > 0 &&
    departmentOk
  );
}

function isAllowedForRole(pathname: string, role: ProfileRole | null): boolean {
  if (!role) {
    return pathname === "/onboarding" || pathname.startsWith("/onboarding/") || pathname === "/pending-approval";
  }
  if (pathname === "/dashboard") return false;
  switch (role) {
    case "student":
      return (
        pathname.startsWith("/dashboard/student") ||
        pathname.startsWith("/internships") ||
        pathname.startsWith("/applications") ||
        pathname.startsWith("/companies") ||
        pathname.startsWith("/profile/student") ||
        pathname.startsWith("/notifications") ||
        pathname.startsWith("/resume-builder") ||
        pathname.startsWith("/onboarding") ||
        pathname === "/pending-approval"
      );
    case "company":
      return (
        pathname === "/dashboard/company" ||
        pathname.startsWith("/company") ||
        pathname.startsWith("/companies") ||
        pathname.startsWith("/profile/company") ||
        pathname.startsWith("/notifications")
      );
    case "supervisor":
      return (
        pathname === "/dashboard/supervisor" ||
        pathname.startsWith("/supervisor") ||
        pathname.startsWith("/notifications")
      );
    case "admin":
      return (
        pathname.startsWith("/admin") ||
        pathname === "/dashboard/admin" ||
        pathname.startsWith("/companies") ||
        pathname.startsWith("/notifications") ||
        pathname === "/account-suspended"
      );
    default:
      return false;
  }
}

function isProtected(pathname: string): boolean {
  return (
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/pending-approval" ||
    pathname === "/account-suspended" ||
    pathname.startsWith("/internships") ||
    pathname.startsWith("/applications") ||
    pathname.startsWith("/companies") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/company") ||
    pathname.startsWith("/supervisor") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/resume-builder")
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (isPublic(pathname) && !isProtected(pathname)) {
    return response;
  }

  if (!user) {
    if (isProtected(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (pathname.startsWith("/settings")) {
    return response;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("middleware profile query error:", profileError);
  }
  const role = (profile?.role as ProfileRole) ?? null;

  if (profile?.is_suspended && pathname !== "/account-suspended") {
    const url = request.nextUrl.clone();
    url.pathname = "/account-suspended";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const { data: latestUpgradeRequest, error: latestUpgradeRequestError } = await supabase
    .from("role_upgrade_requests")
    .select("requested_role, status, payload")
    .eq("user_id", user.id)
    .in("requested_role", ["company", "supervisor"])
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestUpgradeRequestError) {
    console.error("middleware role_upgrade_requests query error:", latestUpgradeRequestError);
  }
  const onboardingRequestedRole =
    latestUpgradeRequest?.requested_role === "company" || latestUpgradeRequest?.requested_role === "supervisor"
      ? latestUpgradeRequest.requested_role
      : null;
  const onboardingRequestStatus = latestUpgradeRequest?.status ?? null;
  const hasOnboardingPayload = hasRequiredOnboardingPayload(
    onboardingRequestedRole,
    latestUpgradeRequest?.payload ?? null
  );

  const metadataRole = isIntentRole(user.user_metadata?.role) ? user.user_metadata.role : null;
  const intendedRole = role === "student" ? metadataRole ?? onboardingRequestedRole : null;
  const onboardingPath = getOnboardingStatePath(intendedRole);

  let onboardingTarget: string | null = null;
  if (role === "student" && intendedRole) {
    if (!latestUpgradeRequest) {
      onboardingTarget = onboardingPath;
    } else if (onboardingRequestStatus === "pending") {
      onboardingTarget = hasOnboardingPayload ? "/pending-approval" : onboardingPath;
    } else if (onboardingRequestStatus === "approved") {
      onboardingTarget = intendedRole === "company" ? "/dashboard/company" : "/dashboard/supervisor";
    } else if (onboardingRequestStatus === "rejected") {
      onboardingTarget = onboardingPath;
    } else {
      onboardingTarget = onboardingPath;
    }
  }

  const allowApprovedProtectedAccess =
    role === "student" &&
    intendedRole &&
    onboardingRequestStatus === "approved" &&
    isCompanyOrSupervisorProtectedPath(pathname);
  if (allowApprovedProtectedAccess) {
    return response;
  }

  if (isAuthPath(pathname)) {
    if (onboardingTarget) {
      return NextResponse.redirect(new URL(onboardingTarget, request.url));
    }
    const home = getRoleHome(role);
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (
    onboardingTarget &&
    (isCompanyOrSupervisorProtectedPath(pathname) ||
      pathname.startsWith("/dashboard/student") ||
      pathname === "/dashboard" ||
      pathname.startsWith("/onboarding") ||
      pathname === "/pending-approval")
  ) {
    if (pathname !== onboardingTarget) {
      return NextResponse.redirect(new URL(onboardingTarget, request.url));
    }
  }

  if (role === "supervisor" && (pathname === "/companies" || pathname.startsWith("/companies/"))) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/companies/, "/supervisor/companies");
    return NextResponse.redirect(url);
  }

  if (isProtected(pathname) && !isAllowedForRole(pathname, role)) {
    const home = getRoleHome(role);
    return NextResponse.redirect(new URL(home, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
