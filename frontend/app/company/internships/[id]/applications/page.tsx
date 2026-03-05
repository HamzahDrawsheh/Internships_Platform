"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Table, Modal, Textarea, EmptyState } from "@/components/ui";

export default function ApplicantsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [detailOpen, setDetailOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const applicants: unknown[] = [];

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Applicants"
          description={id ? `Internship applicants` : "Applicants for this internship."}
          action={
            <Link href="/company/internships">
              <Button variant="secondary">Back to internships</Button>
            </Link>
          }
        />
        {applicants.length === 0 ? (
          <EmptyState
            title="No applicants yet"
            description="Applicants will appear here when students apply. Connect the backend to load data."
          />
        ) : (
          <Table headers={["Student name", "University / year", "Skills", "Status", "Actions"]}>
            <tr><td colSpan={5} className="px-4 py-3 text-sm text-gray-500">No rows</td></tr>
          </Table>
        )}

        <Modal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="Applicant detail"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDetailOpen(false)}>Close</Button>
              <Button variant="primary">Download CV</Button>
            </>
          }
        >
          <p className="text-sm text-gray-600">Full profile and CV download will be available when connected to the backend.</p>
          <Textarea label="Internal notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-4" />
        </Modal>
      </Container>
    </main>
  );
}
