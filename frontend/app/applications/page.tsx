import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui";
import ApplicationsList from "./ApplicationsList";

export default function MyApplicationsPage() {
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
        <ApplicationsList />
      </Container>
    </main>
  );
}
