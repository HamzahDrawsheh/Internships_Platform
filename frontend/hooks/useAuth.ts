"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRole } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export interface UseAuthResult {
  user: User | null;
  role: ProfileRole | null;
  loading: boolean;
}

/**
 * Client-side auth state: session user and profile role.
 * Subscribes to auth changes so Navbar/Sidebar update on login/logout.
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchRole = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      return (data?.role as ProfileRole) ?? null;
    };

    const updateAuth = async (userId: string | undefined) => {
      if (!userId) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      setUser(u);
      const r = await fetchRole(u.id);
      setRole(r);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchRole(session.user.id).then(setRole);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchRole(session.user.id).then(setRole);
      } else {
        setUser(null);
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, role, loading };
}
