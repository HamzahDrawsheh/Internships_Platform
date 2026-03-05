"use client";

import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, EmptyState } from "@/components/ui";

export default function StudentDetailsPage() {
  return (
    <main className="py-8">
      <Container className="max-w-4xl">
        <PageHeader
          title="Student Details"
          description="Monitoring view for assigned student."
          action={
            <Link href="/supervisor/students">
              <Button variant="secondary">Back to list</Button>
            </Link>
          }
        />
        <Card>
          <h2 className="text-sm font-semibold text-gray-900">Student info</h2>
          <p className="mt-2 text-sm text-gray-600">Details will load from the backend when connected.</p>
        </Card>
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Applications history</h2>
          <EmptyState
            className="mt-4"
            title="No application history"
            description="Student details and application history will appear here once supervisor logic exists."
          />
        </section>
      </Container>
    </main>
  );
}
