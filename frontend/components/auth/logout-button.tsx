"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  variant?: "primary" | "secondary" | "danger" | "link";
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({ variant = "secondary", className, children }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <Button type="button" variant={variant} onClick={handleLogout} className={className}>
      {children ?? "Logout"}
    </Button>
  );
}
