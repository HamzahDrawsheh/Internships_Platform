import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, EmptyState } from "@/components/ui";

export default function AdminDashboardPage() {
  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Admin Dashboard"
          description="Platform overview and key metrics."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">Total users</p>
            <p className="text-2xl font-bold text-gray-900">—</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Active internships</p>
            <p className="text-2xl font-bold text-gray-900">—</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Pending moderation</p>
            <p className="text-2xl font-bold text-gray-900">—</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Applications (total)</p>
            <p className="text-2xl font-bold text-gray-900">—</p>
          </Card>
        </div>
        <div className="mt-8">
          <EmptyState
            title="Analytics not available yet"
            description="User management, moderation, and analytics will be available when the admin backend is ready."
          />
        </div>
      </Container>
    </main>
  );
}
