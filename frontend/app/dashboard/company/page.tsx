import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui";
import CompanyDashboardContent from "./CompanyDashboardContent";

export default function CompanyDashboardPage() {
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
        <CompanyDashboardContent />
      </Container>
    </main>
  );
}
