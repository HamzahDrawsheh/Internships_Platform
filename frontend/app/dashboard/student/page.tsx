import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui";
import StudentDashboardContent from "./StudentDashboardContent";

export default function StudentDashboardPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Dashboard</h1>
              <p className="mt-1 text-sm text-[#0F172A]/70">Overview of your applications and next steps.</p>
            </div>
            <Link href="/internships">
              <Button variant="primary">Browse internships</Button>
            </Link>
          </div>

          <section className="mt-10">
            <StudentDashboardContent />
          </section>
        </div>
      </main>
    </div>
  );
}
