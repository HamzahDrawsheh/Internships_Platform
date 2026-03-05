import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, EmptyState } from "@/components/ui";

export default function StudentDashboardPage() {
  const totalApplications = 0;
  const underReview = 0;
  const accepted = 0;
  const recentApplications: unknown[] = [];

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Student Dashboard"
          description="Overview of your applications and next steps."
          action={
            <Link href="/internships">
              <Button variant="primary">Browse internships</Button>
            </Link>
          }
        />
        <div className="grid gap-6 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-gray-500">Total applications</p>
            <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Under review</p>
            <p className="text-2xl font-bold text-gray-900">{underReview}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Accepted</p>
            <p className="text-2xl font-bold text-gray-900">{accepted}</p>
          </Card>
        </div>
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Recent applications</h2>
          <p className="text-sm text-gray-600">Last 5 applications</p>
          {recentApplications.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="No applications yet"
              description="Apply to internships to see them here."
              actionLabel="Browse internships"
              actionHref="/internships"
            />
          ) : (
            <div className="mt-4">Recent applications table (when connected)</div>
          )}
        </section>
      </Container>
    </main>
  );
}
