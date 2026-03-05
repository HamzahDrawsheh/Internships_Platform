import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, EmptyState } from "@/components/ui";

export default function AdminAnalyticsPage() {
  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Analytics"
          description="MVP basic metrics: most active companies and most applied internships."
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold text-gray-900">Most active companies</h3>
            <p className="mt-2 text-sm text-gray-500">Connect backend to load data.</p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-gray-900">Most applied internships</h3>
            <p className="mt-2 text-sm text-gray-500">Connect backend to load data.</p>
          </Card>
        </div>
        <div className="mt-8">
          <EmptyState
            title="Analytics not available yet"
            description="Analytics and metrics will appear here when the admin backend is ready."
          />
        </div>
      </Container>
    </main>
  );
}
