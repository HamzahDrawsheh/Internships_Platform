"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { DetailPageSkeleton } from "@/components/loading";
import { Button, EmptyState } from "@/components/ui";
import { useMessagingActions } from "@/hooks/useMessagingActions";
import { createClient } from "@/lib/supabase/client";

type SupervisorCard = {
  id: string;
  user_id: string;
  department: string | null;
  title: string | null;
  full_name: string;
  email: string;
};

export default function StudentSupervisorPage() {
  const { messageSupervisor, openInbox } = useMessagingActions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsDepartment, setNeedsDepartment] = useState(false);
  const [items, setItems] = useState<SupervisorCard[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const run = async () => {
      setLoading(true);
      setError(null);
      setNeedsDepartment(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in.");
        setLoading(false);
        return;
      }

      const { data: st } = await supabase.from("students").select("department").eq("user_id", user.id).maybeSingle();
      if (!st?.department?.trim()) {
        setNeedsDepartment(true);
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: supRows, error: supErr } = await supabase
        .from("supervisors")
        .select("id, user_id, department, title")
        .order("created_at", { ascending: true });
      if (supErr) {
        console.error("student supervisor list:", supErr);
        setError("Unable to load supervisors.");
        setLoading(false);
        return;
      }

      const rows = (supRows ?? []) as { id: string; user_id: string; department: string | null; title: string | null }[];
      if (rows.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const userIds = rows.map((r) => r.user_id);
      const { data: profiles, error: pe } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      if (pe) console.error("profiles for supervisors:", pe);
      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

      const mapped: SupervisorCard[] = rows.map((r) => {
        const p = profileById.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          department: r.department,
          title: r.title,
          full_name: p?.full_name?.trim() || "—",
          email: p?.email ?? "—",
        };
      });

      setItems(mapped);
      setLoading(false);
    };

    void run();
  }, []);

  const openConversation = (supervisorUserId: string, supervisorName: string) => {
    setOpeningId(supervisorUserId);
    messageSupervisor(supervisorUserId, supervisorName);
    setOpeningId(null);
  };

  return (
    <div>
      <Container className="max-w-3xl">
        <PageHeader
          title="Your supervisor"
          description="Supervisors matching your academic department can guide you and answer questions. Start a private conversation anytime."
        />

        {loading ? (
          <DetailPageSkeleton />
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        ) : needsDepartment ? (
          <EmptyState
            title="Add your department"
            description="We match supervisors using your academic department. Update your profile so eligible supervisors appear here."
            actionLabel="Student profile"
            actionHref="/profile/student"
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No supervisors in your department yet"
            description="When supervisors join your department on the platform, they will appear here. You can still message companies from your applications under Messages."
            actionLabel="Open messages"
            onAction={openInbox}
          />
        ) : (
          <ul className="space-y-4">
            {items.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{s.full_name}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{s.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {s.title?.trim() ? (
                        <span className="rounded-full bg-purple-50 px-2.5 py-1 font-medium text-purple-800 dark:bg-purple-500/15 dark:text-purple-200">
                          {s.title}
                        </span>
                      ) : null}
                      {s.department?.trim() ? (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800 dark:text-gray-300">{s.department}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <Button variant="primary" disabled={openingId === s.user_id} onClick={() => openConversation(s.user_id, s.full_name)}>
                      {openingId === s.user_id ? "Opening…" : "Message supervisor"}
                    </Button>
                    <button
                      type="button"
                      onClick={openInbox}
                      className="text-center text-xs font-medium text-purple-700 underline-offset-2 hover:underline dark:text-purple-300"
                    >
                      Open inbox
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}
