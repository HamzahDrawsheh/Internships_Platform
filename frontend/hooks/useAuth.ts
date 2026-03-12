"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
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

  const fetchRole = async () => {
    try {
      const profile = await api.get<{ role?: ProfileRole }>("/profiles/me");
      return profile?.role ?? null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchRole().then(setRole);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchRole().then(setRole);
      } else {
        setUser(null);
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, role, loading };
}
