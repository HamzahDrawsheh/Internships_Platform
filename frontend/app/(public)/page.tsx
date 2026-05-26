import { LandingPageContent } from "@/components/landing/LandingPageContent";
import { getPlatformStats } from "@/lib/landing/platform-stats";

export default async function LandingPage() {
  const stats = await getPlatformStats();

  return <LandingPageContent stats={stats} />;
}
