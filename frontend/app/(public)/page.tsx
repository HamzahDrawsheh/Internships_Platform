import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <section className="py-20 lg:py-28">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold leading-tight text-[#0F172A] lg:text-5xl">
                Launch your <span className="text-[#7C3AED]">AI Career</span> in Jordan
              </h1>
              <p className="mt-6 max-w-xl text-lg text-[#0F172A]/80">
                Connect with top companies. Find AI & Data Science internships, apply in one click, and track your progress.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/auth/signup"><Button variant="primary" className="px-6 py-3">Get Started</Button></Link>
                <Link href="/auth/login"><Button variant="secondary" className="px-6 py-3">Login</Button></Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="flex h-80 w-full max-w-md items-center justify-center rounded-2xl border border-[#E2E8F0] bg-[#F3E8FF] shadow-sm lg:h-96">
                <Image
                  src="/hero_png.jpg"
                  alt="AI Data Science Illustration"
                  width={600}
                  height={600}
                  className="w-full h-full object-cover rounded-xl"
                  priority
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-[#E2E8F0] bg-white py-16">
        <Container>
          <h2 className="text-2xl font-bold text-[#0F172A]">How it works</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C3AED] text-lg font-bold text-white">1</span>
              <h3 className="mt-4 font-semibold text-[#0F172A]">Sign up & complete your profile</h3>
              <p className="mt-2 text-sm text-[#0F172A]/70">Students add skills and CV; companies add info and create listings.</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C3AED] text-lg font-bold text-white">2</span>
              <h3 className="mt-4 font-semibold text-[#0F172A]">Discover & apply</h3>
              <p className="mt-2 text-sm text-[#0F172A]/70">Browse internships, filter by skill and location, apply with one click.</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C3AED] text-lg font-bold text-white">3</span>
              <h3 className="mt-4 font-semibold text-[#0F172A]">Track & get placed</h3>
              <p className="mt-2 text-sm text-[#0F172A]/70">Follow application status and get notified when companies respond.</p>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t border-[#E2E8F0] bg-white py-8">
        <Container>
          <p className="text-center text-sm text-[#0F172A]/60">AI Intern Jordan · Contact: contact@aiintern.jo</p>
        </Container>
      </footer>
    </main>
  );
}
