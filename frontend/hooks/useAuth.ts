"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api, ApiError } from "@/lib/api";
import type { ProfileRole } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export interface UseAuthResult {
  user: User | null;
  role: ProfileRole | null;
  loading: boolean;
}

/**
 * Client-side auth state: session user and profile role (from backend API).
 * Subscribes to auth changes so Navbar/Sidebar update on login/logout.
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname?.startsWith("/auth");

  const fetchRole = async (): Promise<ProfileRole | null> => {
    try {
      const profile = await api.get<{ role?: ProfileRole }>("/profiles/me");
      return profile?.role ?? null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Unauthorized from backend: clear role; let pages decide whether to redirect
        setRole(null);
        return null;
      }
      return null;
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Skip backend role calls on auth routes to avoid unnecessary 401s during login/signup
    if (isAuthRoute) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const r = await fetchRole();
        setRole(r);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const r = await fetchRole();
        if (r === null) {
          // If backend returns 401 for profiles when we think we have a session, log out user
          setUser(null);
          setRole(null);
          router.push("/auth/login");
        } else {
          setRole(r);
        }
      } else {
        setUser(null);
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [isAuthRoute, router]);

  return { user, role, loading };
}
