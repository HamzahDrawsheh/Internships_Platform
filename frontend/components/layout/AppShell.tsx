"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "./Sidebar";

function showSidebar(pathname: string, hasUser: boolean): boolean {
  if (!hasUser) return false;
  if (pathname === "/" || pathname.startsWith("/auth")) return false;
  if (pathname === "/onboarding") return false;
  return true;
}

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Wraps main content: shows Sidebar + main area when user is logged in and not on public/auth pages.
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const withSidebar = showSidebar(pathname, !!user);

  if (!withSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-1">
      <Sidebar />
      <main className="min-w-0 flex-1 bg-gray-50/30">
        {children}
      </main>
    </div>
  );
}
