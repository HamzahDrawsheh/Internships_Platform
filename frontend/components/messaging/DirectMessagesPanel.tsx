"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { saveMutualContacts } from "@/lib/messaging/contacts";
import { fetchEligiblePeers, type MessagingContact } from "@/lib/messaging/peers";
import {
  conversationUrl,
  type DmConversationRow,
  type DmMessageRow,
  type MessagingViewerRole,
  peerUserId,
} from "@/lib/messaging";
import type { MessageChatTarget } from "@/context/MessagesDrawerContext";
import { createClient } from "@/lib/supabase/client";

const BODY_MAX = 8000;
const POLL_MS = 12_000;

type View = "contacts" | "thread";

type Props = {
  viewerRole: MessagingViewerRole;
  variant: "drawer" | "page";
  basePath?: string;
  onClose?: () => void;
  pendingTarget?: MessageChatTarget | null;
  onPendingHandled?: () => void;
};

export function DirectMessagesPanel({
  viewerRole,
  variant,
  basePath = "/dashboard/student/messages",
  onClose,
  pendingTarget,
  onPendingHandled,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lt } = useI18n();

  const urlSelectedId = variant === "page" ? searchParams.get("c") : null;
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const selectedId = variant === "page" ? urlSelectedId : localSelectedId;
  const [view, setView] = useState<View>("contacts");

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<MessagingContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactSearch, setContactSearch] = useState("");

  const [conversations, setConversations] = useState<DmConversationRow[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [messages, setMessages] = useState<DmMessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composeBody, setComposeBody] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingHandledRef = useRef<string | null>(null);

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

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setContacts([]);
      setContactsLoading(false);
      return;
    }
    setViewerId(user.id);
    const peers = await fetchEligiblePeers(supabase, viewerRole, user.id);
    setContacts(peers);
    setContactsLoading(false);
  }, [supabase, viewerRole]);

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setConversations([]);
      setListLoading(false);
      return;
    }
    setViewerId(user.id);
    const { data, error } = await supabase
      .from("dm_conversations")
      .select("id, kind, student_user_id, peer_user_id, updated_at, created_at")
      .or(`student_user_id.eq.${user.id},peer_user_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });
    if (error) {
      setListError("Could not load conversations.");
      setConversations([]);
      setListLoading(false);
      return;
    }
    const rows = (data ?? []) as DmConversationRow[];
    setConversations(rows);
    await resolveConversationLabels(rows, user.id);
    setListLoading(false);
  }, [resolveConversationLabels, supabase]);

  useEffect(() => {
    void loadContacts();
    void loadConversations();
  }, [loadContacts, loadConversations]);

  const openConversation = useCallback(
    (id: string) => {
      if (variant === "page") {
        router.replace(conversationUrl(basePath, id));
      } else {
        setLocalSelectedId(id);
        setView("thread");
      }
    },
    [basePath, router, variant],
  );

  const goToContacts = useCallback(() => {
    if (variant === "page") {
      router.replace(basePath);
    } else {
      setLocalSelectedId(null);
      setView("contacts");
    }
  }, [basePath, router, variant]);

  const startConversation = useCallback(
    async (kind: DmConversationRow["kind"], peerProfileUserId: string, label?: string, reciprocalLabel?: string) => {
      if (!viewerId) return null;
      setActionError(null);
      setSendBusy(true);

      try {
        if (label) {
          await saveMutualContacts(supabase, viewerId, peerProfileUserId, kind, reciprocalLabel, label);
          await loadContacts();
        }

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
              await loadConversations();
              openConversation(existing.id);
              return existing.id;
            }
          }
          setActionError(error.message || "Could not start conversation.");
          return null;
        }

        const id = inserted?.id as string | undefined;
        if (!id) {
          setActionError("Could not start conversation.");
          return null;
        }
        await loadConversations();
        openConversation(id);
        return id;
      } finally {
        setSendBusy(false);
      }
    },
    [viewerId, viewerRole, supabase, loadContacts, loadConversations, openConversation],
  );

  useEffect(() => {
    if (!pendingTarget || !viewerId) return;
    const key = `${pendingTarget.peerUserId}:${pendingTarget.kind}`;
    if (pendingHandledRef.current === key) return;
    pendingHandledRef.current = key;
    void startConversation(
      pendingTarget.kind,
      pendingTarget.peerUserId,
      pendingTarget.label,
      pendingTarget.reciprocalLabel,
    ).then(() => onPendingHandled?.());
  }, [pendingTarget, viewerId, startConversation, onPendingHandled]);

  useEffect(() => {
    if (variant === "page" && urlSelectedId) setView("thread");
  }, [variant, urlSelectedId]);

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
    if (!selectedId || !viewerId || view !== "thread") {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
  }, [selectedId, viewerId, view, loadMessages]);

  useEffect(() => {
    if (!selectedId || !viewerId || view !== "thread") return;
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
  }, [selectedId, viewerId, view, loadMessages, supabase]);

  const labelForConversation = (c: DmConversationRow) => {
    if (!viewerId) return "…";
    const pid = peerUserId(c, viewerId);
    return labels[pid] ?? (c.kind === "student_supervisor" ? "Supervisor" : "Company");
  };

  const labelForContact = (c: MessagingContact) => c.label;

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.subtitle ?? "").toLowerCase().includes(q),
    );
  }, [contacts, contactSearch]);

  const recentConversations = useMemo(() => {
    if (!viewerId) return [];
    return conversations.map((c) => ({
      conversation: c,
      label: labelForConversation(c),
    }));
  }, [conversations, viewerId, labels]);

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
      setActionError(error.message || "Could not send.");
      return;
    }
    setComposeBody("");
    await loadMessages(selectedId);
    await loadConversations();
  };

  const deleteOwnMessage = async (messageId: string) => {
    if (!window.confirm("Delete this message?")) return;
    const { error } = await supabase.from("dm_messages").delete().eq("id", messageId);
    if (error) {
      setActionError(error.message || "Could not delete message.");
      return;
    }
    if (selectedId) await loadMessages(selectedId);
  };

  const deleteConversation = async () => {
    if (!selectedId) return;
    if (!window.confirm("Delete this entire conversation?")) return;
    const { error } = await supabase.from("dm_conversations").delete().eq("id", selectedId);
    if (error) {
      setActionError(error.message || "Could not delete conversation.");
      return;
    }
    goToContacts();
    await loadConversations();
    setMessages([]);
  };

  const openContact = (contact: MessagingContact) => {
    const existing = conversations.find((c) => {
      if (!viewerId) return false;
      const peer = peerUserId(c, viewerId);
      return peer === contact.userId && c.kind === contact.kind;
    });
    if (existing) {
      openConversation(existing.id);
      return;
    }
    void startConversation(contact.kind, contact.userId, contact.label);
  };

  const showContacts = variant === "drawer" ? view === "contacts" : !selectedId;

  return (
    <div className={`flex flex-col ${variant === "drawer" ? "h-full" : "min-h-[420px]"}`}>
      {actionError ? (
        <p className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {lt(actionError)}
        </p>
      ) : null}
      {listError ? (
        <p className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {lt(listError)}
        </p>
      ) : null}

      {showContacts ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lt("Contacts")}</p>
              {variant === "drawer" && onClose ? (
                <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={lt("Close")}>
                  ✕
                </button>
              ) : null}
            </div>
            <input
              type="search"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder={lt("Search contacts…")}
              className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {recentConversations.length > 0 ? (
              <div className="mb-4">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{lt("Recent")}</p>
                <ul className="space-y-1">
                  {recentConversations.map(({ conversation: c, label }) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => openConversation(c.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-purple-50 dark:hover:bg-purple-500/10"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm dark:bg-purple-500/20">💬</span>
                        <span>
                          <span className="block font-medium text-gray-900 dark:text-gray-100">{label}</span>
                          <span className="text-[11px] text-gray-500">{c.kind === "student_supervisor" ? lt("Supervisor") : lt("Company")}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{lt("All contacts")}</p>
            {contactsLoading || listLoading ? (
              <p className="px-2 py-6 text-sm text-gray-500">{lt("Loading…")}</p>
            ) : filteredContacts.length === 0 ? (
              <p className="px-2 py-6 text-sm text-gray-500">{lt("No contacts yet. Message a company or supervisor to get started.")}</p>
            ) : (
              <ul className="space-y-1">
                {filteredContacts.map((contact) => (
                  <li key={`${contact.kind}:${contact.userId}`}>
                    <button
                      type="button"
                      disabled={sendBusy}
                      onClick={() => openContact(contact)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm dark:bg-gray-800">
                        {contact.kind === "student_company" ? "🏢" : contact.subtitle === "Student" ? "🎓" : "👤"}
                      </span>
                      <span>
                        <span className="block font-medium text-gray-900 dark:text-gray-100">{labelForContact(contact)}</span>
                        {contact.subtitle ? <span className="text-[11px] text-gray-500">{lt(contact.subtitle)}</span> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <>
          <header className="flex items-center gap-2 border-b border-gray-100 px-3 py-3 dark:border-gray-800">
            <button
              type="button"
              onClick={goToContacts}
              className="rounded-lg px-2 py-1 text-sm text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-500/10"
            >
              ← {lt("Contacts")}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {activeConversation ? labelForConversation(activeConversation) : lt("Conversation")}
              </p>
            </div>
            {variant === "drawer" && onClose ? (
              <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={lt("Close")}>
                ✕
              </button>
            ) : null}
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messagesLoading ? (
              <p className="text-sm text-gray-500">{lt("Loading messages…")}</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-500">{lt("No messages yet. Say hello.")}</p>
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
                        <div className={`mt-1 flex items-center justify-between gap-3 text-[10px] ${mine ? "text-purple-100" : "text-gray-500"}`}>
                          <span>{new Date(m.created_at).toLocaleString()}</span>
                          {mine ? (
                            <button type="button" className="underline" onClick={() => void deleteOwnMessage(m.id)}>
                              {lt("Delete")}
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

          <footer className="border-t border-gray-100 p-3 dark:border-gray-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder={lt("Write a message…")}
                rows={2}
                maxLength={BODY_MAX}
                className="min-h-[72px] flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
              <Button variant="primary" disabled={sendBusy || !composeBody.trim()} onClick={() => void sendMessage()}>
                {lt("Send")}
              </Button>
            </div>
            <div className="mt-2 flex justify-end">
              <button type="button" className="text-[11px] text-red-600 underline" onClick={() => void deleteConversation()}>
                {lt("Delete conversation")}
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
