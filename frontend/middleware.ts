import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { ProfileRole } from "@/lib/types";
import { api } from "@/lib/api";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/signup", "/auth/verify"];
const AUTH_PATHS = ["/auth/login", "/auth/signup"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => p === pathname) || pathname === "/auth" || pathname.startsWith("/auth/");
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function getRoleHome(role: ProfileRole): string {
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

function isAllowedForRole(pathname: string, role: ProfileRole | null): boolean {
  if (!role) return pathname === "/onboarding";
  if (pathname === "/dashboard") return false;
  switch (role) {
    case "student":
      return (
        pathname === "/dashboard/student" ||
        pathname.startsWith("/internships") ||
        pathname.startsWith("/applications") ||
        pathname === "/profile/student" ||
        pathname.startsWith("/notifications")
      );
    case "company":
      return (
        pathname === "/dashboard/company" ||
        pathname.startsWith("/company") ||
        pathname === "/profile/company" ||
        pathname.startsWith("/notifications")
      );
    case "supervisor":
      return (
        pathname === "/dashboard/supervisor" ||
        pathname.startsWith("/supervisor") ||
        pathname.startsWith("/notifications")
      );
    case "admin":
      return pathname.startsWith("/admin") || pathname.startsWith("/notifications");
    default:
      return false;
  }
}

function isProtected(pathname: string): boolean {
  return (
    pathname === "/onboarding" ||
    pathname.startsWith("/internships") ||
    pathname.startsWith("/applications") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/company") ||
    pathname.startsWith("/supervisor") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications")
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
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

  let role: ProfileRole | null = null;
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (token) {
    try {
      const profile = await api.get<{ role?: ProfileRole }>("/profiles/me", { token });
      role = profile?.role ?? null;
    } catch {
      // leave role null
    }
  }

  if (isAuthPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.searchParams.set("next", pathname);
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
