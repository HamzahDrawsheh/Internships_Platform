import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="py-16">
        <Container>
          <h1 className="text-4xl font-bold text-gray-900">InternConnect Jordan</h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600">
            Connect AI & Data Science students with companies and universities. Find internships, apply in one click, and track your progress — all in one platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/auth/signup"><Button variant="primary">Sign Up</Button></Link>
            <Link href="/auth/login"><Button variant="secondary">Login</Button></Link>
            <Link href="/internships"><Button variant="secondary">Browse Internships</Button></Link>
          </div>
        </Container>
      </section>

      <section className="border-t border-gray-200 bg-gray-50/50">
        <Container className="py-12">
          <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white font-semibold" aria-hidden>1</span>
              <h3 className="mt-4 font-semibold text-gray-900">Sign up & complete your profile</h3>
              <p className="mt-2 text-sm text-gray-600">Students add skills and CV; companies add company info and create listings.</p>
            </div>
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white font-semibold" aria-hidden>2</span>
              <h3 className="mt-4 font-semibold text-gray-900">Discover & apply</h3>
              <p className="mt-2 text-sm text-gray-600">Browse internships, filter by skill and location, and apply with one click.</p>
            </div>
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white font-semibold" aria-hidden>3</span>
              <h3 className="mt-4 font-semibold text-gray-900">Track & get placed</h3>
              <p className="mt-2 text-sm text-gray-600">Follow application status and get notified when companies respond.</p>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t border-gray-200 py-8">
        <Container>
          <p className="text-center text-sm text-gray-500">InternConnect Jordan · Contact: contact@internconnect.jo</p>
        </Container>
      </footer>
    </main>
  );
}
