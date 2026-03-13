import { Container } from "@/components/layout/Container";
import { LandingHero } from "@/app/(public)/LandingHero";
import { HowItWorks } from "@/app/(public)/HowItWorks";
import { FeaturedInternships } from "@/app/(public)/FeaturedInternships";
import { LandingCta } from "@/app/(public)/LandingCta";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingHero />
      <HowItWorks />
      <FeaturedInternships />
      <LandingCta />
      <footer className="border-t border-gray-200 bg-gray-50/50 py-10">
        <Container>
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} InternConnect Jordan. Connecting talent with opportunity.
            </p>
            <a
              href="mailto:contact@internconnect.jo"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              contact@internconnect.jo
            </a>
          </div>
        </Container>
      </footer>
    </main>
  );
}
