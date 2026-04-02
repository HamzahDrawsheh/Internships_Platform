import { Sidebar } from "@/components/layout/Sidebar";
import StudentDashboardContent from "./StudentDashboardContent";

export default function StudentDashboardPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-gray-950">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <section>
            <StudentDashboardContent />
          </section>
        </div>
      </main>
    </div>
  );
}
