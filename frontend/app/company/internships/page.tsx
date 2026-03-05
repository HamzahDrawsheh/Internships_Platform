import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Table, EmptyState } from "@/components/ui";

export default function ManageInternshipsPage() {
  const internships: unknown[] = [];

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Manage Internships"
          description="Edit, pause, close, or view applicants for each listing."
          action={
            <Link href="/company/internships/new">
              <Button variant="primary">Create internship</Button>
            </Link>
          }
        />
        {internships.length === 0 ? (
          <EmptyState
            title="No internships yet"
            description="Create your first internship listing to start receiving applications."
            actionLabel="Create internship"
            actionHref="/company/internships/new"
          />
        ) : (
          <Table headers={["Title", "Status", "Deadline", "Applicants", "Actions"]}>
            <tr><td colSpan={5} className="px-4 py-3 text-sm text-gray-500">No rows</td></tr>
          </Table>
        )}
      </Container>
    </main>
  );
}
