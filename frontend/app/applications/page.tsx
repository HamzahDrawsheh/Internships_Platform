import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui";
import ApplicationsList from "./ApplicationsList";

export default function MyApplicationsPage() {
  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader
          title="My Applications"
          description="When an internship is marked completed, submit your training evaluation here and leave a company rating below."
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
