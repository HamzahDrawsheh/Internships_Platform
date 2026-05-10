"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  conversationUrl,
  type DmConversationRow,
  type DmMessageRow,
  type MessagingViewerRole,
  peerUserId,
} from "@/lib/messaging";

const BODY_MAX = 8000;
const POLL_MS = 12_000;

type Props = {
  viewerRole: MessagingViewerRole;
  basePath: string;
  title?: string;
  description?: string;
};

async function fetchCompaniesForStudentMessaging(studentDbId: string) {
  const supabase = createClient();
  const { data: apps, error: appErr } = await supabase
    .from("applications")
    .select("position_id")
    .eq("student_id", studentDbId);
  if (appErr || !apps?.length) return [];
  const positionIds = [...new Set(apps.map((a) => a.position_id))];
  const { data: positions, error: posErr } = await supabase
    .from("internship_positions")
    .select("id, company_id")
    .in("id", positionIds);
  if (posErr || !positions?.length) return [];
  const companyIds = [...new Set(positions.map((p) => p.company_id))];
  const { data: companies, error: coErr } = await supabase
    .from("companies")
    .select("id, company_name, user_id")
    .in("id", companyIds);
  if (coErr || !companies?.length) return [];
  const byOwner = new Map<string, { label: string; companyOwnerUserId: string }>();
  for (const c of companies) {
    if (!c.user_id) continue;
    byOwner.set(c.user_id, {
      label: c.company_name?.trim() || "Company",
      companyOwnerUserId: c.user_id,
    });
  }
  return [...byOwner.values()].sort((a, b) => a.label.localeCompare(b.label));
}

async function fetchSupervisorPickupPeers(supervisorDept: string) {
  const supabase = createClient();
  const { data: studentsData, error } = await supabase
    .from("students")
    .select("user_id")
    .eq("department", supervisorDept);
  if (error || !studentsData?.length) return [];
  const userIds = [...new Set(studentsData.map((s) => s.user_id))];
  const { data: profiles, error: pe } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
  if (pe || !profiles) return [];
  return profiles.map((p) => ({
    userId: p.id,
    label: p.full_name?.trim() || p.email || "Student",
  })).sort((a, b) => a.label.localeCompare(b.label));
}

async function fetchCompanyApplicantPeers(companyDbId: string) {
  const supabase = createClient();
  const { data: positions, error: pErr } = await supabase
    .from("internship_positions")
    .select("id")
    .eq("company_id", companyDbId);
  if (pErr || !positions?.length) return [];
  const posIds = positions.map((p) => p.id);
  const { data: apps, error: aErr } = await supabase.from("applications").select("student_id").in("position_id", posIds);
  if (aErr || !apps?.length) return [];
  const studentIds = [...new Set(apps.map((a) => a.student_id))];
  const { data: studentsRows, error: sErr } = await supabase.from("students").select("user_id").in("id", studentIds);
  if (sErr || !studentsRows?.length) return [];
  const userIds = [...new Set(studentsRows.map((s) => s.user_id))];
  const { data: profiles, error: pe } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
  if (pe || !profiles) return [];
  return profiles.map((p) => ({
    userId: p.id,
    label: p.full_name?.trim() || p.email || "Student",
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export default function DirectMessagesShell({
  viewerRole,
  basePath,
  title = "Messages",
  description = "Private conversations stay saved until you delete them.",
}: Props) {
  // Single client instance — a new createClient() each render breaks useCallback/useEffect deps and caused an infinite reload loop.
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("c");

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [supervisorDept, setSupervisorDept] = useState<string | null>(null);
  const [companyRowId, setCompanyRowId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<DmConversationRow[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [messages, setMessages] = useState<DmMessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composeBody, setComposeBody] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pickStudentLabel, setPickStudentLabel] = useState("");
  const [pickCompanyLabel, setPickCompanyLabel] = useState("");
  const [studentPeers, setStudentPeers] = useState<{ userId: string; label: string }[]>([]);
  const [companyPeers, setCompanyPeers] = useState<{ label: string; companyOwnerUserId: string }[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const resolveConversationLabels = useCallback(
    async (convos: DmConversationRow[], uid: string) => {
      const peers = convos.map((c) => peerUserId(c, uid));
      if (!peers.length) {
        setLabels({});
        return;
      }
      const uniquePeers = [...new Set(peers)];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, role").in("id", uniquePeers);
      const next: Record<string, string> = {};
      profiles?.forEach((p) => {
        next[p.id] = p.full_name?.trim() || p.email || "User";
      });
      const companyUserIds = profiles?.filter((p) => p.role === "company").map((p) => p.id) ?? [];
      if (companyUserIds.length) {
        const { data: companies } = await supabase.from("companies").select("user_id, company_name").in("user_id", companyUserIds);
        companies?.forEach((co) => {
          if (co.user_id && co.company_name?.trim()) next[co.user_id] = co.company_name.trim();
        });
      }
      setLabels(next);
    },
    [supabase],
  );

  const loadViewerContext = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setViewerId(null);
      return null;
    }
    setViewerId(user.id);

    if (viewerRole === "student") {
      const { data: st } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (st?.id) void fetchCompaniesForStudentMessaging(st.id).then(setCompanyPeers);
    } else if (viewerRole === "supervisor") {
      const { data: supRow } = await supabase.from("supervisors").select("department").eq("user_id", user.id).maybeSingle();
      const dept = supRow?.department?.trim() ?? null;
      setSupervisorDept(dept);
      if (dept) void fetchSupervisorPickupPeers(dept).then(setStudentPeers);
    } else if (viewerRole === "company") {
      const { data: co } = await supabase.from("companies").select("id").eq("user_id", user.id).maybeSingle();
      setCompanyRowId(co?.id ?? null);
      if (co?.id) void fetchCompanyApplicantPeers(co.id).then(setStudentPeers);
    }
    return user.id;
  }, [supabase, viewerRole]);

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    const uid = await loadViewerContext();
    if (!uid) {
      setConversations([]);
      setListLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("dm_conversations")
      .select("id, kind, student_user_id, peer_user_id, updated_at, created_at")
      .or(`student_user_id.eq.${uid},peer_user_id.eq.${uid}`)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("dm_conversations load:", error);
      setListError("Could not load conversations.");
      setConversations([]);
      setListLoading(false);
      return;
    }
    const rows = (data ?? []) as DmConversationRow[];
    setConversations(rows);
    await resolveConversationLabels(rows, uid);
    setListLoading(false);
  }, [loadViewerContext, resolveConversationLabels, supabase]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!viewerId) return;
      setMessagesLoading(true);
      setActionError(null);
      const { data, error } = await supabase
        .from("dm_messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("dm_messages load:", error);
        setActionError("Could not load messages.");
        setMessages([]);
        setMessagesLoading(false);
        return;
      }
      setMessages((data ?? []) as DmMessageRow[]);
      setMessagesLoading(false);
      queueMicrotask(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    },
    [supabase, viewerId],
  );

  useEffect(() => {
    if (!selectedId || !viewerId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
  }, [selectedId, viewerId, loadMessages]);

  useEffect(() => {
    if (!selectedId || !viewerId) return;
    const channel = supabase
      .channel(`dm:${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${selectedId}` },
        () => void loadMessages(selectedId),
      )
      .subscribe();
    const poll = window.setInterval(() => void loadMessages(selectedId), POLL_MS);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [selectedId, viewerId, loadMessages, supabase]);

  const labelForConversation = (c: DmConversationRow) => {
    if (!viewerId) return "…";
    const pid = peerUserId(c, viewerId);
    const base = labels[pid];
    if (base) return base;
    return c.kind === "student_supervisor" ? "Supervisor / student" : "Company / student";
  };

  const openConversation = (id: string) => {
    router.replace(conversationUrl(basePath, id));
  };

  const startConversation = async (kind: DmConversationRow["kind"], peerProfileUserId: string) => {
    if (!viewerId) return;
    setActionError(null);
    setSendBusy(true);

    let student_user_id: string;
    let peer_user_id: string;
    if (viewerRole === "student") {
      student_user_id = viewerId;
      peer_user_id = peerProfileUserId;
    } else {
      student_user_id = peerProfileUserId;
      peer_user_id = viewerId;
    }

    const { data: inserted, error } = await supabase
      .from("dm_conversations")
      .insert({ kind, student_user_id, peer_user_id })
      .select("id")
      .single();

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        const { data: existing } = await supabase
          .from("dm_conversations")
          .select("id")
          .eq("kind", kind)
          .eq("student_user_id", student_user_id)
          .eq("peer_user_id", peer_user_id)
          .maybeSingle();
        if (existing?.id) {
          setSendBusy(false);
          await loadConversations();
          openConversation(existing.id);
          return;
        }
      }
      console.error("dm_conversations insert:", error);
      setActionError(error.message || "Could not start conversation.");
      setSendBusy(false);
      return;
    }

    const id = inserted?.id as string | undefined;
    setSendBusy(false);
    if (!id) {
      setActionError("Could not start conversation.");
      return;
    }
    await loadConversations();
    openConversation(id);
  };

  const sendMessage = async () => {
    if (!viewerId || !selectedId || !composeBody.trim()) return;
    const trimmed = composeBody.trim();
    if (trimmed.length > BODY_MAX) {
      setActionError(`Message is too long (max ${BODY_MAX} characters).`);
      return;
    }
    setSendBusy(true);
    setActionError(null);
    const { error } = await supabase.from("dm_messages").insert({
      conversation_id: selectedId,
      sender_id: viewerId,
      body: trimmed,
    });
    setSendBusy(false);
    if (error) {
      console.error("dm_messages insert:", error);
      setActionError(error.message || "Could not send.");
      return;
    }
    setComposeBody("");
    await loadMessages(selectedId);
    await loadConversations();
  };

  const deleteOwnMessage = async (messageId: string) => {
    if (!window.confirm("Delete this message for everyone in the conversation?")) return;
    setActionError(null);
    const { error } = await supabase.from("dm_messages").delete().eq("id", messageId);
    if (error) {
      setActionError(error.message || "Could not delete message.");
      return;
    }
    if (selectedId) await loadMessages(selectedId);
  };

  const deleteConversation = async () => {
    if (!selectedId) return;
    if (!window.confirm("Delete this entire conversation and all messages? This cannot be undone.")) return;
    setActionError(null);
    const { error } = await supabase.from("dm_conversations").delete().eq("id", selectedId);
    if (error) {
      setActionError(error.message || "Could not delete conversation.");
      return;
    }
    router.replace(basePath);
    await loadConversations();
    setMessages([]);
  };

  const renderStartPanel = () => {
    if (viewerRole === "student") {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Start a conversation</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Message your academic supervisor from{" "}
            <Link href="/dashboard/student/supervisor" className="font-medium text-purple-700 underline dark:text-purple-300">
              Your supervisor
            </Link>
            . Message a company you&apos;ve applied to below.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              Company (from your applications)
              <select
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                value={pickCompanyLabel}
                onChange={(e) => setPickCompanyLabel(e.target.value)}
              >
                <option value="">Select…</option>
                {companyPeers.map((c) => (
                  <option key={c.companyOwnerUserId} value={c.companyOwnerUserId}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="primary"
              disabled={!pickCompanyLabel || sendBusy}
              onClick={() => void startConversation("student_company", pickCompanyLabel)}
            >
              Open chat
            </Button>
          </div>
          {companyPeers.length === 0 ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Apply to an internship first to message a company.</p>
          ) : null}
        </div>
      );
    }

    if (viewerRole === "supervisor" || viewerRole === "company") {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {viewerRole === "supervisor" ? "Message a student in your department" : "Message an applicant"}
          </p>
          {!supervisorDept && viewerRole === "supervisor" ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Set your department on your supervisor profile to see students.</p>
          ) : null}
          {!companyRowId && viewerRole === "company" ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Complete your company profile first.</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              Student
              <select
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                value={pickStudentLabel}
                onChange={(e) => setPickStudentLabel(e.target.value)}
              >
                <option value="">Select…</option>
                {studentPeers.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="primary"
              disabled={!pickStudentLabel || sendBusy}
              onClick={() =>
                void startConversation(viewerRole === "supervisor" ? "student_supervisor" : "student_company", pickStudentLabel)
              }
            >
              Open chat
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      <Container className="max-w-6xl">
        <PageHeader title={title} description={description} />

        <div className="mt-6 space-y-4">
          {renderStartPanel()}

          {listError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {listError}
            </p>
          ) : null}
          {actionError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {actionError}
            </p>
          ) : null}

          <div className="flex min-h-[420px] flex-col gap-4 lg:flex-row">
            <aside className="w-full shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:w-72">
              <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Inbox</p>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {listLoading ? (
                  <p className="px-2 py-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                ) : conversations.length === 0 ? (
                  <p className="px-2 py-6 text-sm text-gray-500 dark:text-gray-400">No conversations yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {conversations.map((c) => {
                      const active = c.id === selectedId;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => openConversation(c.id)}
                            className={`flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                              active
                                ? "bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-200"
                                : "text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/80"
                            }`}
                          >
                            <span className="font-medium">{labelForConversation(c)}</span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              {c.kind === "student_supervisor" ? "Supervisor" : "Company"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>

            <section className="min-h-[420px] flex-1 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              {!selectedId ? (
                <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Select a conversation or start a new one.
                </div>
              ) : (
                <>
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {activeConversation ? labelForConversation(activeConversation) : "Conversation"}
                      </p>
                      {activeConversation ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activeConversation.kind === "student_supervisor" ? "Student ↔ Supervisor" : "Student ↔ Company"}
                        </p>
                      ) : null}
                    </div>
                    <Button variant="secondary" className="text-red-700 dark:text-red-300" onClick={() => void deleteConversation()}>
                      Delete conversation
                    </Button>
                  </header>

                  <div className="max-h-[52vh] overflow-y-auto px-4 py-4">
                    {messagesLoading ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages…</p>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet. Say hello.</p>
                    ) : (
                      <ul className="space-y-3">
                        {messages.map((m) => {
                          const mine = viewerId && m.sender_id === viewerId;
                          return (
                            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                  mine
                                    ? "bg-purple-600 text-white dark:bg-purple-500"
                                    : "border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                                <div className={`mt-1 flex items-center justify-between gap-3 text-[10px] ${mine ? "text-purple-100" : "text-gray-500 dark:text-gray-400"}`}>
                                  <span>{new Date(m.created_at).toLocaleString()}</span>
                                  {mine ? (
                                    <button
                                      type="button"
                                      className="underline"
                                      onClick={() => void deleteOwnMessage(m.id)}
                                    >
                                      Delete
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                        <div ref={bottomRef} />
                      </ul>
                    )}
                  </div>

                  <footer className="border-t border-gray-100 p-4 dark:border-gray-800">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <textarea
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        placeholder="Write a message…"
                        rows={3}
                        maxLength={BODY_MAX}
                        className="min-h-[88px] flex-1 resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
                      />
                      <Button variant="primary" className="sm:self-stretch" disabled={sendBusy || !composeBody.trim()} onClick={() => void sendMessage()}>
                        Send
                      </Button>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{composeBody.length}/{BODY_MAX}</p>
                  </footer>
                </>
              )}
            </section>
          </div>
        </div>
      </Container>
    </div>
  );
}
