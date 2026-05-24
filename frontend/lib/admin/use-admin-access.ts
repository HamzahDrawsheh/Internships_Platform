"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAdminAccess() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      setLoading(true);
      setError(null);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setIsAdmin(false);
        setError("Please login to access admin pages.");
        setLoading(false);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) {
        setIsAdmin(false);
        setError("Unable to verify admin access.");
        setLoading(false);
        return;
      }
      if (profile?.role !== "admin") {
        setIsAdmin(false);
        setError("Access denied. Admin role is required.");
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      setLoading(false);
    })();
  }, []);

  return { loading, isAdmin, error };
}
