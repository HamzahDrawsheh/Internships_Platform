"use client";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card } from "@/components/ui";

export default function ReportsExportPage() {
  return (
    <main className="py-8">
      <Container className="max-w-3xl">
        <PageHeader
          title="Reports Export"
          description="Download CSV placements report for your department."
        />
        <Card>
          <p className="text-sm text-gray-600">
            Export a CSV report of student placements and internship status. Connect to the backend to generate the report.
          </p>
          <Button type="button" variant="primary" className="mt-4">
            Export CSV
          </Button>
          <p className="mt-2 text-xs text-gray-500">CSV export will be implemented with reporting logic.</p>
        </Card>
      </Container>
    </main>
  );
}
