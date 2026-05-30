"use client";

import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";

export function LandingHeroSection() {
  const { t } = useI18n();

  return (
    <section id="home" className="relative overflow-hidden bg-white py-20 transition-colors duration-300 lg:py-28 dark:bg-gradient-to-tr dark:from-slate-950 dark:via-[#12081f] dark:to-slate-900">
      <div className="pointer-events-none absolute -right-20 top-10 hidden h-72 w-72 rounded-full bg-purple-400/20 blur-3xl dark:block dark:bg-purple-600/10" />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-start">
            <p className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
              <span aria-hidden>✨</span>
              {t("landing.heroBadge")}
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-[#0F172A] transition-colors duration-300 sm:text-5xl lg:text-6xl dark:text-white">
              {t("landing.heroTitleBefore")}{" "}
              <span className="bg-gradient-to-r from-[#7C3AED] to-[#6366F1] bg-clip-text text-transparent">
                {t("landing.heroTitleHighlight")}
              </span>{" "}
              {t("landing.heroTitleAfter")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-[#0F172A]/80 transition-colors duration-300 lg:mx-0 dark:text-slate-400">
              {t("landing.heroSubtitle")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Link href="/auth/signup">
                <Button
                  variant="primary"
                  className="bg-gradient-to-r from-[#7C3AED] to-[#6366F1] px-7 py-3 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30"
                >
                  {t("nav.getStarted")}
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  variant="secondary"
                  className="border-[#C4B5FD] px-7 py-3 text-[#6D28D9] transition-all duration-300 hover:scale-105 hover:border-[#A78BFA] hover:bg-[#F5F3FF] hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                  {t("nav.login")}
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative flex w-full max-w-2xl items-center justify-center">
              <div className="pointer-events-none absolute -z-10 hidden h-64 w-64 rounded-full bg-[#C4B5FD]/30 blur-3xl dark:block dark:bg-purple-600/20" />
              <div className="group flex w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 ring-1 ring-slate-100 transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:ring-purple-900/40">
                <Image
                  src="/hero-dashboard.jpg"
                  alt={t("landing.heroImageAlt")}
                  width={1024}
                  height={683}
                  className="h-auto w-full rounded-2xl object-contain transition-transform duration-300 group-hover:scale-105"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
