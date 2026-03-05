import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button } from "@/components/ui";

export default function CompanyDashboardPage() {
  const activeInternships = 0;
  const totalApplicationsReceived = 0;

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Company Dashboard"
          description="Manage your internships and applicants."
          action={
            <Link href="/company/internships/new">
              <Button variant="primary">Create internship</Button>
            </Link>
          }
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <p className="text-sm text-gray-500">Active internships</p>
            <p className="text-2xl font-bold text-gray-900">{activeInternships}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total applications received</p>
            <p className="text-2xl font-bold text-gray-900">{totalApplicationsReceived}</p>
          </Card>
        </div>
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Recent applicants</h2>
          <p className="mt-1 text-sm text-gray-600">Connect to the backend to load recent applicants.</p>
        </section>
      </Container>
    </main>
  );
}
