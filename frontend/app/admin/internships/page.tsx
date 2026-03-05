import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, EmptyState } from "@/components/ui";

export default function InternshipModerationPage() {
  const pendingInternships: unknown[] = [];

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Internship Moderation"
          description="Approve or reject internship listings before they go live."
        />
        {pendingInternships.length === 0 ? (
          <EmptyState
            title="No pending internships"
            description="Pending internships and moderation actions will appear here when the admin backend is ready."
          />
        ) : (
          <Table headers={["Title", "Company", "Submitted", "Actions"]}>
            <tr><td colSpan={4} className="px-4 py-3 text-sm text-gray-500">No rows</td></tr>
          </Table>
        )}
      </Container>
    </main>
  );
}
