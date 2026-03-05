import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, EmptyState } from "@/components/ui";

export default function StudentsListPage() {
  const students: unknown[] = [];

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Students List"
          description="Assigned students: applications, acceptance count, and placement status."
        />
        {students.length === 0 ? (
          <EmptyState
            title="No students assigned yet"
            description="Assigned students will appear here once supervisor_students logic exists."
          />
        ) : (
          <Table headers={["Student", "University", "Applications", "Status", "Actions"]}>
            <tr><td colSpan={5} className="px-4 py-3 text-sm text-gray-500">No rows</td></tr>
          </Table>
        )}
      </Container>
    </main>
  );
}
