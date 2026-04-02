import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui";
import CompanyDashboardContent from "./CompanyDashboardContent";

export default function CompanyDashboardPage() {
  return (
    <main className="bg-gray-50 py-6 transition-colors duration-300 sm:py-8 dark:bg-gray-950">
      <Container>
        <section className="animate-fade-up rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
                Welcome back, Company 👋
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Manage your internships, applicants, and company activity
              </p>
            </div>
            <Link href="/company/internships/new">
              <Button
                variant="primary"
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
              >
                <span aria-hidden>＋</span>
                Create internship
              </Button>
            </Link>
          </div>
        </section>
        <CompanyDashboardContent />
      </Container>
    </main>
  );
}
