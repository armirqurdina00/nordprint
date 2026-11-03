"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, ChatStatus, Conversation } from "@/lib/types";
import type { BlobMode, UploadError } from "@/lib/upload-rules";
import { errorInfo, listTime, mergeMessages, nextId, postMessage, request, usePoll, type Pending } from "@/lib/chat-client";
import { uploadErrorMessage, type AdminDict } from "@/lib/admin-i18n";
import ChatThread from "@/components/chat/ChatThread";
import ChatComposer from "@/components/chat/ChatComposer";
import { useAdminT } from "./AdminI18n";
import { useChatLive } from "./ChatLive";

type Selected = { conversation: Conversation; messages: ChatMessage[] };

const displayName = (c: Conversation, t: AdminDict) => c.name || t.chat.visitor(c.id);

function initials(c: Conversation) {
  const parts = c.name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase() : "";
}

function Avatar({ c, size = "md" }: { c: Conversation; size?: "md" | "lg" }) {
  const i = initials(c);
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-snow font-semibold text-fjord ring-1 ring-mist ${size === "lg" ? "h-11 w-11" : "h-10 w-10 text-sm"}`}>
      {i || (
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5" />
        </svg>
      )}
    </span>
  );
}

/** Two-pane inbox: conversations on the left, the open conversation on the right (one at a time on phones). */
export default function ChatInbox({
  conversations,
  rev: initialRev,
  selected,
  missing,
  direct,
  pages,
}: {
  conversations: Conversation[];
  rev: number;
  selected: Selected | null;
  missing: boolean;
  direct: BlobMode;
  pages: Record<string, string>;
}) {
  const { t } = useAdminT();
  const live = useChatLive();
  const [list, setList] = useState(conversations);
  const rev = useRef(initialRev);
  const [tab, setTab] = useState<ChatStatus>(selected?.conversation.status ?? "open");
  const [query, setQuery] = useState("");
  const selectedId = selected?.conversation.id;

  // the server sends a fresh list on every navigation
  useEffect(() => {
    setList(conversations);
    rev.current = initialRev;
  }, [conversations, initialRev]);

  // opening a conversation marks it read on the server; update the menu badge right away
  useEffect(() => {
    if (selectedId) live.refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // something changed in the inbox: fetch the list again
  useEffect(() => {
    if (live.rev === rev.current) return;
    request<{ rev: number; conversations?: Conversation[] }>(`/api/admin/chat?list=1&rev=${rev.current}`)
      .then((d) => {
        rev.current = d.rev;
        if (d.conversations) setList(d.conversations);
      })
      .catch(() => undefined);
  }, [live.rev]);

  const counts = useMemo(() => ({ open: list.filter((c) => c.status === "open").length, closed: list.filter((c) => c.status === "closed").length }), [list]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((c) => c.status === tab && (!q || [c.name, c.email, c.preview].some((v) => v.toLowerCase().includes(q))));
  }, [list, tab, query]);

  const update = (c: Conversation) => setList((l) => l.map((x) => (x.id === c.id ? { ...x, ...c } : x)));

  return (
    <div className="mt-6 grid h-[calc(100dvh-14.5rem)] min-h-[30rem] overflow-hidden rounded-2xl bg-paper ring-1 ring-mist max-lg:mt-0 max-lg:h-[calc(100dvh-8rem)] md:max-lg:h-[calc(100dvh-6rem)] lg:grid-cols-[minmax(260px,320px)_1fr]">
      {/* conversation list */}
      <aside className={`${selected || missing ? "max-lg:hidden" : ""} flex min-h-0 flex-col border-mist lg:border-r`}>
        <div className="space-y-3 border-b border-mist p-3">
          <div role="tablist" aria-label={t.chat.title} className="grid grid-cols-2 rounded-full bg-snow p-1 ring-1 ring-mist">
            {(["open", "closed"] as ChatStatus[]).map((s) => (
              <button
                key={s}
                role="tab"
                type="button"
                aria-selected={tab === s}
                onClick={() => setTab(s)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${tab === s ? "bg-granite text-snow" : "text-fjord hover:text-granite"}`}
              >
                {s === "open" ? t.chat.open : t.chat.closed}
                <span className="ml-1.5 font-normal tabular-nums opacity-75">{counts[s]}</span>
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="chat-search">{t.chat.search}</label>
          <input id="chat-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.chat.search} className="field py-2 text-[0.95rem]" />
        </div>
        {shown.length === 0 ? (
          <p className="p-5 text-fjord">{query ? t.chat.noMatch : tab === "open" ? t.chat.empty : t.chat.emptyClosed}</p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-mist overflow-y-auto">
            {shown.map((c) => {
              const unread = c.id === selectedId ? 0 : c.unreadAdmin;
              const current = c.id === selectedId;
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/chatt?c=${c.id}`}
                    scroll={false}
                    aria-current={current ? "true" : undefined}
                    className={`flex gap-3 px-3.5 py-3 transition-colors ${current ? "bg-snow" : "hover:bg-snow/60"}`}
                  >
                    <Avatar c={c} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`min-w-0 flex-1 truncate ${unread ? "font-bold" : "font-semibold"}`}>{displayName(c, t)}</span>
                        <span className="shrink-0 text-xs tabular-nums text-fjord">{listTime(c.updatedAt, t.locale, t.chat.yesterday)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-medium text-granite" : "text-fjord"}`}>
                          {c.lastFrom === "admin" && <span className="text-fjord">{t.chat.you}: </span>}
                          {c.preview || t.chat.attachment}
                        </span>
                        {c.lang === "en" && <span className="shrink-0 rounded bg-snow px-1.5 text-[0.7rem] font-semibold text-fjord ring-1 ring-mist">EN</span>}
                        {unread > 0 && (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-hallon px-1.5 text-xs font-semibold tabular-nums text-white" aria-label={t.chat.unread(unread)}>
                            {unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* open conversation */}
      <section className={`${selected || missing ? "" : "max-lg:hidden"} flex min-h-0 min-w-0 flex-col`}>
        {selected ? (
          <ConversationPane key={selected.conversation.id} initial={selected} direct={direct} pages={pages} onChange={update} />
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center text-fjord print-layers">
            <div>
              {missing && (
                <Link href="/admin/chatt" className="mb-4 inline-block font-medium text-granite underline underline-offset-4 lg:hidden">
                  {t.chat.back}
                </Link>
              )}
              <p className="max-w-xs">{missing ? t.chat.gone : t.chat.pick}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ConversationPane({
  initial,
  direct,
  pages,
  onChange,
}: {
  initial: Selected;
  direct: BlobMode;
  pages: Record<string, string>;
  onChange: (c: Conversation) => void;
}) {
  const { t } = useAdminT();
  const live = useChatLive();
  const router = useRouter();
  const [conv, setConv] = useState(initial.conversation);
  const [messages, setMessages] = useState(initial.messages);
  const [pending, setPending] = useState<Pending[]>([]);
  const [gone, setGone] = useState(false);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const base = `/api/admin/chat/${conv.id}`;

  usePoll(
    async () => {
      try {
        const d = await request<Selected>(`${base}?after=${nextId(messagesRef.current)}&seen=1`);
        setConv(d.conversation);
        setMessages((l) => mergeMessages(l, d.messages));
        // new visitor messages were just marked read: update the menu badge and tab title now
        if (d.messages.some((m) => m.from === "visitor")) live.refresh().catch(() => undefined);
      } catch (e) {
        if (errorInfo(e).code === "gone") setGone(true);
        throw e;
      }
    },
    3000,
    !gone
  );

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  const errorText = (e: unknown) => {
    const info = errorInfo(e);
    if (info.code === "file") return uploadErrorMessage(t, { kind: info.kind ?? "failed", detail: info.detail ?? "", mb: info.mb });
    if (info.code === "empty") return t.chat.errEmpty;
    if (info.code === "long") return t.chat.errLong;
    if (info.code === "gone") return t.chat.gone;
    return t.chat.errNetwork;
  };

  const deliver = async (p: Pending) => {
    setPending((l) => l.map((x) => (x.key === p.key ? { ...p, state: "sending", error: undefined } : x)));
    try {
      const d = await postMessage(base, p, direct);
      if (d.message) setMessages((l) => mergeMessages(l, [d.message!]));
      setPending((l) => l.filter((x) => x.key !== p.key));
      const next = { ...conv, status: "open" as ChatStatus, unreadAdmin: 0, lastFrom: "admin" as const, preview: p.text.slice(0, 140), updatedAt: new Date().toISOString() };
      setConv(next);
      onChange(next);
      live.refresh().catch(() => undefined);
    } catch (e) {
      console.error("[chat] reply could not be sent", e);
      setPending((l) => l.map((x) => (x.key === p.key ? { ...x, state: "failed", error: errorText(e) } : x)));
    }
  };

  const setStatus = async (status: ChatStatus) => {
    setBusy(true);
    try {
      await request(base, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const next = { ...conv, status };
      setConv(next);
      onChange(next);
      live.refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!armed) return setArmed(true);
    setBusy(true);
    try {
      await request(base, { method: "DELETE" });
      await live.refresh().catch(() => undefined);
      router.push("/admin/chatt");
    } finally {
      setBusy(false);
    }
  };

  const name = displayName(conv, t);
  const first = conv.name.split(" ")[0];
  const mailto = conv.email
    ? `mailto:${conv.email}?subject=${encodeURIComponent(conv.lang === "en" ? t.chat.emailSubjectEn : t.chat.emailSubject)}&body=${encodeURIComponent(
        conv.lang === "en" ? `Hi${first ? ` ${first}` : ""},\n\n` : `Hej${first ? ` ${first}` : ""},\n\n`
      )}`
    : "";
  const pageLabel = conv.page ? pages[conv.page] ?? conv.page : "";

  return (
    <>
      <header className="border-b border-mist px-4 py-3">
        <Link href="/admin/chatt" scroll={false} className="mb-2 inline-flex items-center gap-1 text-sm text-fjord hover:text-granite lg:hidden">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          {t.chat.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Avatar c={conv} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="flex flex-wrap items-center gap-2 font-sans text-lg font-semibold tracking-normal">
              <span className="truncate">{name}</span>
              {conv.lang === "en" && <span className="rounded bg-snow px-1.5 text-xs font-semibold text-fjord ring-1 ring-mist">{t.chat.englishNote}</span>}
            </h2>
            <p className="flex flex-wrap gap-x-4 text-sm text-fjord">
              {conv.email ? (
                <a href={`mailto:${conv.email}`} className="underline underline-offset-2 hover:text-granite">{conv.email}</a>
              ) : (
                <span>{t.chat.noEmail}</span>
              )}
              {pageLabel && (
                <span className="min-w-0 truncate">
                  {t.chat.startedOn}{" "}
                  <a href={conv.page} target="_blank" className="underline underline-offset-2 hover:text-granite">{pageLabel}</a>
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
            {mailto && (
              <a href={mailto} className="btn btn-ghost px-3.5 py-2 text-sm">{t.chat.replyByEmail}</a>
            )}
            <button type="button" disabled={busy || gone} onClick={() => setStatus(conv.status === "open" ? "closed" : "open")} className="btn btn-ghost px-3.5 py-2 text-sm">
              {conv.status === "open" ? t.chat.close : t.chat.reopen}
            </button>
            <button
              type="button"
              disabled={busy || gone}
              onClick={remove}
              className={`btn px-3.5 py-2 text-sm ${armed ? "bg-hallon-dark text-white" : "text-hallon-dark ring-[1.5px] ring-inset ring-hallon-soft hover:bg-hallon-soft"}`}
            >
              {armed ? t.chat.confirmDelete : t.chat.delete}
            </button>
          </div>
        </div>
      </header>

      <ChatThread
        className="print-layers min-h-0 flex-1 bg-snow px-4 py-4"
        messages={messages}
        pending={pending}
        mine="admin"
        locale={t.locale}
        seenAt={conv.visitorSeenAt}
        onRetry={(key) => {
          const p = pending.find((x) => x.key === key);
          if (p) deliver(p);
        }}
        labels={{ you: t.chat.you, other: name, seen: t.chat.seen, today: t.chat.today, yesterday: t.chat.yesterday, file: t.chat.attachment, failed: t.chat.failed, retry: t.chat.retry, sending: t.chat.sending, log: t.chat.log }}
      />

      <div className="border-t border-mist bg-paper p-3">
        {gone ? (
          <p role="alert" className="px-1 py-2 font-medium text-hallon-dark">{t.chat.gone}</p>
        ) : (
          <ChatComposer
            id="chat-reply"
            autoFocus
            hint={t.chat.hint}
            fileError={(e: UploadError) => errorText(e)}
            onSend={(text, files) => {
              const p: Pending = { key: crypto.randomUUID(), text, files, state: "sending" };
              setPending((l) => [...l, p]);
              deliver(p);
            }}
            labels={{ placeholder: t.chat.placeholder, send: t.chat.send, attach: t.chat.attach, removeFile: t.chat.removeFile, maxFiles: t.chat.errMaxFiles, empty: t.chat.errEmpty }}
          />
        )}
      </div>
    </>
  );
}
