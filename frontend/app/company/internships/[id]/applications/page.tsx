"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Table, Modal, Textarea, EmptyState } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Application } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

type Applicant = Application;

export default function ApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const internshipId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const { role, loading: authLoading } = useAuth();

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isCompany = role === "company";

  useEffect(() => {
    if (!internshipId) {
      setError("Invalid internship id.");
      setLoading(false);
      return;
    }

    if (!authLoading && !isCompany) {
      setError("Only company users can view applicants for this internship.");
      setLoading(false);
      return;
    }
  }, [internshipId, authLoading, isCompany]);

  useEffect(() => {
    if (!internshipId || !isCompany || authLoading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<{ data: Applicant[] }>(`/internships/${internshipId}/applications`)
      .then(({ data }) => {
        if (!cancelled) {
          setApplicants(data ?? []);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          const next = encodeURIComponent(`/company/internships/${internshipId}/applications`);
          router.push(`/auth/login?next=${next}`);
          return;
        }
        setError("Failed to load applicants. Please try again later.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [internshipId, isCompany, authLoading, router]);

  const updateStatus = async (applicationId: string, status: Application["status"]) => {
    setUpdatingId(applicationId);
    try {
      const updated = await api.patch<Application>(`/applications/${applicationId}`, { status });
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: updated.status } : a))
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const next = encodeURIComponent(`/company/internships/${internshipId}/applications`);
        router.push(`/auth/login?next=${next}`);
        return;
      }
      // surface minimal message; could be improved with toast
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const openDetail = (app: Applicant) => {
    setSelectedApplicant(app);
    setDetailOpen(true);
  };

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Applicants"
          description={internshipId ? "Internship applicants" : "Applicants for this internship."}
          action={
            <Link href="/company/internships">
              <Button variant="secondary">Back to internships</Button>
            </Link>
          }
        />

        {loading ? (
          <p className="mt-8 text-sm text-gray-600">Loading applicants…</p>
        ) : error ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : applicants.length === 0 ? (
          <EmptyState
            title="No applicants yet"
            description="Applicants will appear here when students apply."
          />
        ) : (
          <Table headers={["Student ID", "Cover letter", "Status", "Applied at", "Actions"]}>
            {applicants.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {a.student_id}
                </td>
                <td className="max-w-xs px-4 py-3 text-sm text-gray-600">
                  <button
                    type="button"
                    className="line-clamp-2 text-left hover:underline"
                    onClick={() => openDetail(a)}
                  >
                    {a.cover_letter || "—"}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                  {a.status}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => updateStatus(a.id, "accepted")}
                      disabled={updatingId === a.id}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateStatus(a.id, "rejected")}
                      disabled={updatingId === a.id}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateStatus(a.id, "under_review")}
                      disabled={updatingId === a.id}
                    >
                      Keep pending
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <Modal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="Applicant detail"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
            </>
          }
        >
          {selectedApplicant ? (
            <>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">Student ID:</span> {selectedApplicant.student_id}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-gray-900">Status:</span> {selectedApplicant.status}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-gray-900">Cover letter:</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                {selectedApplicant.cover_letter || "—"}
              </p>
              <Textarea
                label="Internal notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-4"
              />
            </>
          ) : (
            <p className="text-sm text-gray-600">Select an applicant to view details.</p>
          )}
        </Modal>
      </Container>
    </main>
  );
}
