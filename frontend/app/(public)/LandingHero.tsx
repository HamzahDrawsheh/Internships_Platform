import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white px-4 pt-16 pb-24 sm:px-6 sm:pt-24 sm:pb-32 lg:px-8">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Find Your Internship in Jordan
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
            Connect students, companies, and supervisors in one platform.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/internships">
              <Button variant="primary" className="min-w-[180px] px-6 py-3 text-base">
                Browse Internships
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="secondary" className="min-w-[180px] px-6 py-3 text-base">
                Sign Up
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-gray-700 hover:text-gray-900">
              Log in
            </Link>
          </p>
        </div>
      </Container>
    </section>
  );
}
