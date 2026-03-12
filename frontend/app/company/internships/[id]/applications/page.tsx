"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Table, Modal, Textarea, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function ApplicantsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [detailOpen, setDetailOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Applicants");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rows, setRows] = useState<
    {
      id: string;
      student_id: string;
      status: "pending" | "accepted" | "rejected";
      applied_at: string;
      message: string | null;
      student_name: string;
      university: string;
      skills: string;
    }[]
  >([]);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !id) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: position } = await supabase
        .from("internship_positions")
        .select("id, title")
        .eq("id", id)
        .eq("company_id", company.id)
        .single();

      if (!position) {
        setRows([]);
        setLoading(false);
        return;
      }

      setTitle(position.title);

      const { data: apps } = await supabase
        .from("applications")
        .select("id, student_id, status, applied_at, message")
        .eq("position_id", position.id)
        .order("applied_at", { ascending: false });

      const baseApps = apps ?? [];
      const studentIds = [...new Set(baseApps.map((a) => a.student_id))];
      const { data: students } = studentIds.length
        ? await supabase
            .from("students")
            .select("id, user_id, university, skills")
            .in("id", studentIds)
        : { data: [] as { id: string; user_id: string; university: string | null; skills: string | null }[] };
      const studentById = new Map((students ?? []).map((s) => [s.id, s]));

      const userIds = [...new Set((students ?? []).map((s) => s.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] as { id: string; full_name: string | null }[] };
      const profileByUserId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      setRows(
        baseApps.map((app) => {
          const student = studentById.get(app.student_id);
          return {
            id: app.id,
            student_id: app.student_id,
            status: app.status,
            applied_at: app.applied_at,
            message: app.message,
            student_name: student ? profileByUserId.get(student.user_id) ?? "Student" : "Student",
            university: student?.university ?? "—",
            skills: student?.skills ?? "—",
          };
        })
      );
      setLoading(false);
    };

    load();
  }, [id]);

  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);

  const updateStatus = async (applicationId: string, status: "pending" | "accepted" | "rejected") => {
    const supabase = createClient();
    const { error } = await supabase.from("applications").update({ status }).eq("id", applicationId);
    if (error) return;
    setRows((prev) => prev.map((row) => (row.id === applicationId ? { ...row, status } : row)));
  };

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Applicants"
          description={id ? `Internship applicants for "${title}"` : "Applicants for this internship."}
          action={
            <Link href="/company/internships">
              <Button variant="secondary">Back to internships</Button>
            </Link>
          }
        />
        {loading ? (
          <p className="text-sm text-gray-500">Loading applicants...</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No applicants yet"
            description="Applicants will appear here when students apply."
          />
        ) : (
          <Table headers={["Student name", "University / year", "Skills", "Status", "Actions"]}>
            {rows.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{app.student_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{app.university}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{app.skills}</td>
                <td className="px-4 py-3 text-sm capitalize text-gray-600">{app.status}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => updateStatus(app.id, "pending")}>Pending</Button>
                    <Button variant="primary" onClick={() => updateStatus(app.id, "accepted")}>Accept</Button>
                    <Button variant="danger" onClick={() => updateStatus(app.id, "rejected")}>Reject</Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedId(app.id);
                        setDetailOpen(true);
                      }}
                    >
                      View
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
              <Button variant="secondary" onClick={() => setDetailOpen(false)}>Close</Button>
              <Button variant="primary">Download CV</Button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            {selected
              ? `Applied on ${new Date(selected.applied_at).toLocaleDateString()}`
              : "Applicant details"}
          </p>
          {selected?.message && (
            <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {selected.message}
            </div>
          )}
          <Textarea label="Internal notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-4" />
        </Modal>
      </Container>
    </main>
  );
}
