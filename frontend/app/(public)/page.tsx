import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <section className="bg-gradient-to-tr from-[#F8FAFC] via-[#F5EEFF] to-[#EEF2FF] py-20 transition-colors duration-300 lg:py-28 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="text-center lg:text-left">
              <h1 className="animate-fade-up text-4xl font-extrabold leading-tight tracking-tight text-[#0F172A] transition-colors duration-300 sm:text-5xl lg:text-6xl dark:text-white">
                Start your <span className="text-[#7C3AED]">AI career</span> in Jordan
              </h1>
              <p className="animate-fade-up animate-delay-1 mx-auto mt-6 max-w-xl text-lg text-[#0F172A]/80 transition-colors duration-300 lg:mx-0 dark:text-slate-400">
                Discover real internships, apply faster, and track every step from one professional platform.
              </p>
              <div className="animate-fade-up animate-delay-2 mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <Link href="/auth/signup">
                  <Button
                    variant="primary"
                    className="bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] px-7 py-3 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  >
                    Get Started
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button
                    variant="secondary"
                    className="border-[#C4B5FD] px-7 py-3 text-[#6D28D9] transition-all duration-300 hover:scale-105 hover:border-[#A78BFA] hover:bg-[#F5F3FF] hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                  >
                    Login
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative flex h-80 w-full max-w-md items-center justify-center lg:h-96">
                <div className="animate-float-y pointer-events-none absolute -z-10 h-64 w-64 rounded-full bg-[#C4B5FD]/30 blur-3xl" />
                <div className="animate-float-y group flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F3E8FF] shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <Image
                  src="/hero_png.jpg"
                  alt="AI Data Science Illustration"
                  width={600}
                  height={600}
                  className="h-full w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-105"
                  priority
                />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-[#E2E8F0] bg-white py-16 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
        <Container>
          <h2 className="text-2xl font-bold text-[#0F172A] transition-colors duration-300 dark:text-white">Why students choose us</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-800">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDE9FE] text-xl">🚀</span>
              <h3 className="mt-4 font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">Curated opportunities</h3>
              <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Explore active internships from real companies hiring AI talent.</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-800">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDE9FE] text-xl">⚡</span>
              <h3 className="mt-4 font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">Fast applications</h3>
              <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Apply quickly and manage your internship journey without switching tools.</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-800">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDE9FE] text-xl">🔔</span>
              <h3 className="mt-4 font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">Clear updates</h3>
              <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Get notified as soon as companies review, accept, or reject your applications.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-[#E2E8F0] bg-white py-20 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
        <Container>
          <h2 className="text-2xl font-bold text-[#0F172A] transition-colors duration-300 dark:text-white">How it works</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-800">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C3AED] text-lg font-bold text-white">1</span>
              <h3 className="mt-4 font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">Sign up & complete your profile</h3>
              <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Students add skills and CV; companies add info and create listings.</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-800">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C3AED] text-lg font-bold text-white">2</span>
              <h3 className="mt-4 font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">Discover & apply</h3>
              <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Browse internships, filter by skill and location, apply with one click.</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-800">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C3AED] text-lg font-bold text-white">3</span>
              <h3 className="mt-4 font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">Track & get placed</h3>
              <p className="mt-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">Follow application status and get notified when companies respond.</p>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t border-[#E2E8F0] bg-white py-8 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
        <Container>
          <p className="text-center text-sm text-[#0F172A]/60 transition-colors duration-300 dark:text-slate-400">AI Intern Jordan · Contact: contact@aiintern.jo</p>
        </Container>
      </footer>
    </main>
  );
}
