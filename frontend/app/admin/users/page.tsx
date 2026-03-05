import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, EmptyState } from "@/components/ui";

export default function UserManagementPage() {
  const users: unknown[] = [];

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="User Management"
          description="View and manage user accounts. Suspend or unsuspend as needed."
        />
        {users.length === 0 ? (
          <EmptyState
            title="No user data yet"
            description="User list and actions will appear here when the admin backend is ready."
          />
        ) : (
          <Table headers={["User", "Email", "Role", "Status", "Actions"]}>
            <tr><td colSpan={5} className="px-4 py-3 text-sm text-gray-500">No rows</td></tr>
          </Table>
        )}
      </Container>
    </main>
  );
}
