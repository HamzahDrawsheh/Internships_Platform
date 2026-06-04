import type { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AppRouter = ReturnType<typeof useRouter>;

/** Signs the user out and redirects to login. */
export async function performLogout(
  router: AppRouter,
  options?: { beforeSignOut?: () => void },
): Promise<void> {
  options?.beforeSignOut?.();

  const supabase = createClient();
  await supabase.auth.signOut();
  router.push("/auth/login");
  router.refresh();
}
