import { LandingPageContent } from "@/components/landing/LandingPageContent";
import { getPlatformStats } from "@/lib/landing/platform-stats";

/** Refresh landing stats from Supabase at most every minute. */
export const revalidate = 60;

export default async function LandingPage() {
  const stats = await getPlatformStats();

  return <LandingPageContent stats={stats} />;
}
