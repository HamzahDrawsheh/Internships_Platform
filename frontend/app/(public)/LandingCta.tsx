import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";

export function LandingCta() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-gray-900 px-6 py-16 text-center shadow-xl sm:px-12 sm:py-20">
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to find your next opportunity?
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              Join students, companies, and supervisors already using InternConnect Jordan.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button
                  variant="primary"
                  className="min-w-[160px] bg-white text-gray-900 hover:bg-gray-100"
                >
                  Sign Up
                </Button>
              </Link>
              <Link href="/internships">
                <Button
                  variant="secondary"
                  className="min-w-[160px] border-gray-500 bg-transparent text-white hover:bg-gray-800"
                >
                  Browse Internships
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
