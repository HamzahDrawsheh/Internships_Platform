import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, EmptyState } from "@/components/ui";

export default function CompanyApplicantsPage() {
  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Applicants"
          description="View and manage applicants across your internship listings."
          action={
            <Link href="/company/internships">
              <Button variant="primary">Manage internships</Button>
            </Link>
          }
        />
        <EmptyState
          title="View applicants per internship"
          description="Open each internship from Manage internships to see and manage its applicants."
          actionLabel="Go to internships"
          actionHref="/company/internships"
        />
      </Container>
    </main>
  );
}
