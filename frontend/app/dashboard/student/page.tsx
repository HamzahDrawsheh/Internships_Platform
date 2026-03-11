import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui";
import StudentDashboardContent from "./StudentDashboardContent";

export default function StudentDashboardPage() {
  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Dashboard"
          description="Overview of your applications and next steps."
          action={
            <Link href="/internships">
              <Button variant="primary">Browse internships</Button>
            </Link>
          }
        />
        <div className="mt-8">
          <StudentDashboardContent />
        </div>
      </Container>
    </main>
  );
}
