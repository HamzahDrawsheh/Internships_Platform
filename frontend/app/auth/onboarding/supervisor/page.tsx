import { redirect } from "next/navigation";

export default function LegacyAuthSupervisorOnboardingRedirectPage() {
  redirect("/onboarding/supervisor");
}
