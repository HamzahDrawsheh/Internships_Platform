import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Table, EmptyState } from "@/components/ui";

export default function MyApplicationsPage() {
  const applications: unknown[] = [];

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="My Applications"
          description="Track status of your internship applications."
          action={
            <Link href="/internships">
              <Button variant="primary">Browse internships</Button>
            </Link>
          }
        />
        {applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Apply to internships to see them here."
            actionLabel="Browse internships"
            actionHref="/internships"
          />
        ) : (
          <Table headers={["Internship", "Company", "Applied date", "Status", "Action"]}>
            <tr><td colSpan={5} className="px-4 py-3 text-sm text-gray-500">No rows</td></tr>
          </Table>
        )}
      </Container>
    </main>
  );
}
