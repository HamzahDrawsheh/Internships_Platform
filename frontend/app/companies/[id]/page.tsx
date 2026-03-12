import Link from "next/link";
import { Button } from "@/components/ui";
import { InternshipCard } from "@/components/internships/InternshipCard";

export default async function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const openInternships: { id: string; title: string; locationType?: string; skills?: string[] }[] = [];

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="h-48 bg-[#E2E8F0] lg:h-64" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-[#F3E8FF] shadow-lg sm:h-32 sm:w-32">
              <span className="text-4xl font-bold text-[#7C3AED]">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Company Name</h1>
              <p className="mt-1 text-sm text-[#0F172A]/70">Technology · Amman, Jordan</p>
            </div>
          </div>
          <Button variant="primary" className="rounded-xl shadow-md">Follow</Button>
        </div>

        <section className="mt-10 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0F172A]">About</h2>
          <p className="mt-3 text-sm text-[#0F172A]/80">
            Company description will load from the backend. We focus on AI and data science talent in Jordan.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-[#0F172A]">Open internships</h2>
          <p className="mt-1 text-sm text-[#0F172A]/70">Current openings at this company.</p>
          {openInternships.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-12 text-center">
              <p className="text-sm text-[#0F172A]/60">No open internships at the moment.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {openInternships.map((i) => (
                <InternshipCard key={i.id} id={i.id} title={i.title} locationType={i.locationType} skills={i.skills} />
              ))}
            </div>
          )}
        </section>

        <p className="mt-8">
          <Link href="/companies" className="text-sm font-medium text-[#7C3AED] hover:text-[#6D28D9]">
            ← Back to companies
          </Link>
        </p>
      </div>
    </main>
  );
}
