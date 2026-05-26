import StudentDashboardContent from "./StudentDashboardContent";

export default function StudentDashboardPage() {
  return (
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <section>
          <StudentDashboardContent />
        </section>
      </div>
    </main>
  );
}
