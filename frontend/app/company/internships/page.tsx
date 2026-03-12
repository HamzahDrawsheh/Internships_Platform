import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui";
import CompanyInternshipsList from "./CompanyInternshipsList";

export default function ManageInternshipsPage() {
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
        <CompanyInternshipsList />
      </Container>
    </main>
  );
}
