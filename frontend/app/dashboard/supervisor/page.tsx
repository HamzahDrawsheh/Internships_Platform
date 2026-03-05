import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, EmptyState } from "@/components/ui";

export default function SupervisorDashboardPage() {
  const assignedStudents = 0;
  const totalApplications = 0;

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Supervisor Dashboard"
          description="Monitor assigned students and their internship activity."
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <p className="text-sm text-gray-500">Assigned students</p>
            <p className="text-2xl font-bold text-gray-900">{assignedStudents}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total applications (aggregate)</p>
            <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
          </Card>
        </div>
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Students preview</h2>
          <p className="mt-1 text-sm text-gray-600">Assigned students will appear here when connected to the backend.</p>
          <EmptyState
            className="mt-4"
            title="No students assigned yet"
            description="Student assignment and placement data will appear here once the supervisor logic is available."
            actionLabel="View students"
            actionHref="/supervisor/students"
          />
        </section>
      </Container>
    </main>
  );
}
