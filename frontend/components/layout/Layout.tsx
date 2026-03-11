"use client";

import { AppShell } from "./AppShell";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Global layout: top Navbar + conditional Sidebar + main content.
 * Use in root layout or any layout that needs the full app shell.
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <AppShell>{children}</AppShell>
    </div>
  );
}
