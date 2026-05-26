import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-only Supabase client. Validates env in the browser so misconfiguration
 * surfaces as a clear error instead of a generic `TypeError: Failed to fetch`.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (typeof window !== "undefined") {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local, then restart `npm run dev`."
      );
    }
    try {
      new URL(supabaseUrl);
    } catch {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL must be a full URL (e.g. https://xxxx.supabase.co). Fix frontend/.env.local."
      );
    }
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}