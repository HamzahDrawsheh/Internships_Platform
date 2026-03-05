"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Badge, Button, Modal, Textarea } from "@/components/ui";

const locationLabel: Record<string, string> = { remote: "Remote", onsite: "On-site", hybrid: "Hybrid" };

export default function InternshipDetailsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  // No backend: show placeholder detail layout. When connected, replace with real data.
  const title = "Internship Title";
  const companyName = "Company Name";
  const locationType = "remote";
  const description = "Internship description will load from the database when connected.";
  const skills = ["Python", "Machine Learning", "SQL"];
  const durationWeeks = "12";
  const startDate = "—";
  const deadline = "—";
  const openPositions = "1";

  return (
    <main className="py-8">
      <Container className="max-w-4xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="mt-1 text-gray-600">{companyName}</p>
            <Badge variant="info" className="mt-2">
              {locationLabel[locationType] ?? locationType}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">Bookmark</Button>
            <Button variant="primary" onClick={() => setApplyOpen(true)}>
              Apply
            </Button>
          </div>
        </div>

        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
          <section>
            <h2 className="text-sm font-semibold text-gray-900">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-gray-600">{description}</p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-gray-900">Required skills</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s} variant="default">{s}</Badge>
              ))}
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-3">
            <div>
              <span className="text-sm text-gray-500">Duration</span>
              <p className="font-medium text-gray-900">{durationWeeks} weeks</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Start date</span>
              <p className="font-medium text-gray-900">{startDate}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Deadline</span>
              <p className="font-medium text-gray-900">{deadline}</p>
            </div>
          </section>
          <section className="rounded border border-gray-100 bg-gray-50/50 p-4">
            <h2 className="text-sm font-semibold text-gray-900">Company</h2>
            <p className="mt-1 text-sm text-gray-600">{companyName} — Open positions: {openPositions}</p>
          </section>
        </div>

        <p className="mt-4">
          <Link href="/internships" className="text-sm font-medium text-gray-900 hover:underline">
            ← Back to listings
          </Link>
        </p>

        <Modal
          isOpen={applyOpen}
          onClose={() => setApplyOpen(false)}
          title="Apply for this internship"
          footer={
            <>
              <Button variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setApplyOpen(false)}>Submit application</Button>
            </>
          }
        >
          <p className="text-sm text-gray-600">Your profile will be sent to the company. Optionally add a cover letter below.</p>
          <Textarea
            label="Cover letter (optional)"
            rows={4}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            className="mt-4"
          />
        </Modal>
      </Container>
    </main>
  );
}
