"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";

const LS_OPEN = "internconnect-student-chat-open";
const LS_WIDE = "internconnect-student-chat-wide";
const MAX_INPUT_CHARS = 2000;
const SOFT_LIMIT_HINT = 1800;

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I’m here to help with your internships, applications, and any training feedback you’ve saved. Ask me anything about those — I’ll stay grounded in your account data, and you can open “See resources” when you want the exact sources.",
};

type ChatSource = { id: string; type: string; title: string };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  streaming?: boolean;
};
type ChatApiResponse =
  | { ok: true; answer: string; out_of_context: boolean; sources: ChatSource[] }
  | { ok: false; error: string };

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function splitForSequentialDisplay(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [""];

  const byLine = normalized
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byLine.length > 1) return byLine;

  const sentenceParts =
    normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? null;
  if (sentenceParts && sentenceParts.length > 1) return sentenceParts;

  return [normalized];
}

/** High-contrast typing indicator — compact by default for the chat widget. */
function ChatLoadingIndicator({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={classNames("flex flex-col", compact ? "gap-1" : "gap-1.5")}
      role="status"
      aria-live="polite"
      aria-label="Assistant is thinking"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-5 items-end gap-1 px-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="chat-loading-dot inline-block h-2 w-2 shrink-0 rounded-full bg-purple-600 shadow-sm dark:bg-purple-400"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
        <span className="text-[11px] font-medium leading-none text-gray-600 dark:text-gray-300">
          Thinking…
        </span>
      </div>
      {!compact ? (
        <div className="flex gap-1 pt-0.5" aria-hidden>
          <span className="h-1 max-w-[120px] flex-1 rounded-full bg-gray-300/90 motion-safe:animate-pulse dark:bg-gray-600/90" />
          <span className="h-1 w-8 rounded-full bg-gray-300/70 motion-safe:animate-pulse motion-safe:[animation-delay:200ms] dark:bg-gray-600/70" />
          <span className="h-1 w-5 rounded-full bg-gray-300/50 motion-safe:animate-pulse motion-safe:[animation-delay:400ms] dark:bg-gray-600/50" />
        </div>
      ) : null}
    </div>
  );
}

function AssistantReplyBubble({ message }: { message: ChatMessage }) {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const hasSources = Boolean(message.sources && message.sources.length > 0);
  const showResourcesUi = hasSources && !message.streaming;

  return (
    <div
      className={classNames(
        "max-w-[85%] rounded-2xl border border-gray-200/80 bg-gray-50 px-3 py-2 text-sm shadow-sm",
        "text-gray-900 dark:border-gray-700/80 dark:bg-gray-800/90 dark:text-gray-100"
      )}
    >
      {message.content ? (
        <ChatMarkdown content={message.content} />
      ) : message.streaming ? (
        <ChatLoadingIndicator compact />
      ) : null}

      {showResourcesUi ? (
        <div className="mt-2 border-t border-gray-200/90 pt-2 dark:border-gray-600/80">
          <button
            type="button"
            onClick={() => setResourcesOpen((v) => !v)}
            className="text-xs font-medium text-purple-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:text-purple-300 dark:focus-visible:ring-offset-gray-900"
          >
            {resourcesOpen ? "Hide resources" : "See resources"}
          </button>
          {resourcesOpen ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-700 dark:text-gray-200">
              {message.sources!.slice(0, 5).map((s) => (
                <li key={s.id}>
                  {s.title} <span className="opacity-70">({s.type})</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function StudentAssistantChat() {
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [liveRegion, setLiveRegion] = useState<{ text: string; key: number }>({ text: "", key: 0 });

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate open/wide from localStorage after mount */
    try {
      const o = localStorage.getItem(LS_OPEN);
      const w = localStorage.getItem(LS_WIDE);
      if (o === "1") setOpen(true);
      if (w === "1") setWide(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_OPEN, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_WIDE, wide ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [wide, hydrated]);

  const announce = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setLiveRegion({ text: t.slice(0, 600), key: Date.now() });
  }, []);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [open, messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 160)}px`;
  }, [input, open]);

  const isStreamingReply = useMemo(() => messages.some((m) => m.streaming), [messages]);
  const canSend = useMemo(
    () =>
      input.trim().length > 0 &&
      !loading &&
      !isStreamingReply &&
      input.length <= MAX_INPUT_CHARS,
    [input, loading, isStreamingReply]
  );

  const revealAssistantMessage = async (
    assistantId: string,
    fullText: string,
    sources: ChatSource[]
  ) => {
    const chunks = splitForSequentialDisplay(
      fullText ||
        "I’m not sure yet — could you tell me a bit more about what you mean?"
    );
    const delayMs = 320;

    for (let i = 0; i < chunks.length; i += 1) {
      await new Promise<void>((r) => {
        setTimeout(r, delayMs);
      });
      const soFar = chunks.slice(0, i + 1).join("\n\n");
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: soFar } : m))
      );
    }

    const finalText =
      chunks.join("\n\n") ||
      fullText.trim() ||
      "I don’t have enough from your profile yet to answer that — could you share which internship or application you mean?";

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId ? { ...m, streaming: false, sources } : m
      )
    );
    announce(`Assistant: ${finalText}`);
  };

  function resetChat() {
    if (loading || isStreamingReply) return;
    setMessages([{ ...WELCOME_MESSAGE, id: "welcome" }]);
    setInput("");
    setLiveRegion({ text: "", key: Date.now() });
  }

  async function send() {
    const text = input.trim().slice(0, MAX_INPUT_CHARS);
    if (!text || loading || isStreamingReply) return;

    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: text }]);

    const appendAssistantError = (content: string) => {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content }]);
      announce(`Assistant: ${content}`);
    };

    try {
      const res = await fetch("/api/chat/student-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      let payload: unknown = null;
      try {
        payload = (await res.json()) as unknown;
      } catch {
        payload = null;
      }

      const api = (payload ?? {}) as Partial<ChatApiResponse> & { ok?: unknown; error?: unknown };

      if (!res.ok || api.ok !== true) {
        const err = api.error != null ? String(api.error) : `${res.status} ${res.statusText}`;
        appendAssistantError(
          err === "ai_not_configured"
            ? "AI isn’t configured on the server yet (missing OPENAI_API_KEY). Once that’s set, I’ll be happy to help!"
            : `Something went wrong on my side (${err}). Please try again in a moment.`
        );
        setLoading(false);
        return;
      }

      const okPayload = api as Extract<ChatApiResponse, { ok: true }>;
      const answer = typeof okPayload.answer === "string" ? okPayload.answer : "";
      const sources = Array.isArray(okPayload.sources) ? (okPayload.sources as ChatSource[]) : [];

      setLoading(false);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          streaming: true,
        },
      ]);

      await revealAssistantMessage(
        assistantId,
        answer ||
          "I don’t have enough from your profile yet to answer that — could you share which internship or application you mean?",
        sources
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "network_error";
      appendAssistantError(
        `I couldn’t reach the server just now (${msg}). Please check your connection and try again.`
      );
      setLoading(false);
    }
  }

  const shellOuter =
    open && wide
      ? "fixed top-[4.75rem] left-4 bottom-4 z-50 flex flex-col"
      : "fixed left-5 bottom-5 z-50 flex flex-col";

  const shellInner = classNames(
    "flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900",
    wide
      ? "h-full w-[min(480px,calc(100vw-2rem))] shadow-md"
      : "max-h-[min(640px,calc(100vh-5rem))] w-[360px] max-w-[calc(100vw-2rem)]"
  );

  return (
    <div className={shellOuter}>
      <div
        key={liveRegion.key}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveRegion.text}
      </div>

      {open ? (
        <div className={shellInner}>
          <div className="flex flex-shrink-0 flex-col border-b border-gray-200 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:gap-2 px-3 py-3 sm:px-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                ✨ AI Assistant
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Answers from your profile — not human chat
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-end gap-1 sm:mt-0">
              <button
                type="button"
                onClick={resetChat}
                disabled={loading || isStreamingReply}
                className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
              >
                New chat
              </button>
              <button
                type="button"
                onClick={() => setWide((w) => !w)}
                className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
              >
                {wide ? "Compact" : "Wide panel"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
              >
                Close
              </button>
            </div>
          </div>

          <div
            className={classNames(
              "min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4",
              wide ? "" : "max-h-[min(440px,calc(100vh-16rem))]"
            )}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={classNames(
                  "mb-3 flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {m.role === "user" ? (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-md shadow-purple-500/25">
                    {m.content}
                  </div>
                ) : (
                  <AssistantReplyBubble message={m} />
                )}
              </div>
            ))}

            {loading ? (
              <div className="mb-3 flex justify-start">
                <div className="min-w-0 rounded-2xl border border-gray-200/80 bg-white px-3 py-2 shadow-sm dark:border-gray-700/80 dark:bg-gray-800/90">
                  <ChatLoadingIndicator />
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 p-3 dark:border-gray-800">
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) =>
                  setInput(e.target.value.slice(0, MAX_INPUT_CHARS))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask a question… (Shift+Enter for new line)"
                className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-purple-500/30 focus:ring-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
              <button
                type="button"
                disabled={!canSend}
                onClick={() => void send()}
                className={classNames(
                  "h-min self-end rounded-xl px-3 py-2 text-sm font-medium shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900",
                  canSend
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25 hover:from-purple-700 hover:to-indigo-700"
                    : "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                )}
              >
                Send
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <span>
                I only use facts from your account; if something isn’t there, I’ll ask gently.
              </span>
              <span
                className={classNames(
                  "tabular-nums",
                  input.length >= SOFT_LIMIT_HINT
                    ? "font-medium text-amber-600 dark:text-amber-400"
                    : ""
                )}
              >
                {input.length} / {MAX_INPUT_CHARS}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-teal-200 bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-teal-500/25 transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-teal-500/40 dark:focus-visible:ring-offset-gray-900"
          title="AI Assistant — help with internships and applications"
        >
          ✨ AI Assistant
        </button>
      )}
    </div>
  );
}
