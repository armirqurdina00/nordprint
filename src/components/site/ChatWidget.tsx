"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import type { ChatMessage, ChatStatus, Lang } from "@/lib/types";
import type { BlobMode, UploadError } from "@/lib/upload-rules";
import { errorInfo, mergeMessages, nextId, postMessage, request, usePoll, type Pending } from "@/lib/chat-client";
import ChatThread from "@/components/chat/ChatThread";
import ChatComposer from "@/components/chat/ChatComposer";
import { NPMark } from "./Logo";

type View = { status: ChatStatus; name: string; email: string; adminSeenAt: string; unread: number };
type Poll = { conversation: View | null; messages?: ChatMessage[] };

const FLAG = "np_chat_on";
const SKIP_CONTACT = "np_chat_contact_skip";
const hasFlag = () => document.cookie.split("; ").some((c) => c === `${FLAG}=1`);

function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11.5c0 4.14-3.58 7.5-8 7.5-1.2 0-2.34-.25-3.36-.7L4 19.5l1.2-3.6A7.1 7.1 0 0 1 4 11.5C4 7.36 7.58 4 12 4s8 3.36 8 7.5Z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.6" />
    </svg>
  );
}

/** Lets visitors chat with the studio. Replies are written in the admin panel. */
export default function ChatWidget({ lang, direct }: { lang: Lang; direct: BlobMode }) {
  const d = t(lang).chat;
  const order = t(lang).order;
  const locale = lang === "en" ? "en-GB" : "sv-SE";
  const panelId = useId();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false); // this browser has a conversation
  const [view, setView] = useState<View | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [skipContact, setSkipContact] = useState(true);
  const launcher = useRef<HTMLButtonElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    setActive(hasFlag());
    setSkipContact(localStorage.getItem(SKIP_CONTACT) === "1");
  }, []);

  const errorText = useCallback(
    (e: unknown) => {
      const info = errorInfo(e);
      switch (info.code) {
        case "file":
          return info.kind === "type" ? order.errFileType(info.detail ?? "") : info.kind === "size" ? order.errFileSize(info.detail ?? "", info.mb ?? 0) : order.errUpload(info.detail ?? "");
        case "empty":
          return d.errEmpty;
        case "long":
          return d.errLong;
        case "email":
          return d.errEmail;
        case "rate":
          return d.errRate;
        case "unavailable":
          return d.errUnavailable;
        default:
          return d.errNetwork;
      }
    },
    [d, order]
  );

  const reset = () => {
    setActive(false);
    setView(null);
    setMessages([]);
  };

  const refresh = useCallback(async () => {
    const seen = openRef.current ? "&seen=1" : "";
    const data = await request<Poll>(`/api/chat?after=${nextId(messagesRef.current)}${seen}`);
    if (!data.conversation) {
      reset();
      return;
    }
    setView(data.conversation);
    setMessages((list) => mergeMessages(list, data.messages ?? []));
  }, []);

  // load the conversation when the chat is opened, then keep it fresh
  useEffect(() => {
    if (open && (active || hasFlag())) refresh().catch(() => undefined);
  }, [open, active, refresh]);
  usePoll(refresh, open ? 3500 : 30000, active);

  // Escape closes; on phones the chat covers the page, so the page must not scroll behind it
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const small = window.matchMedia("(max-width: 639px)").matches;
    const { overflow } = document.body.style;
    if (small) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const deliver = async (p: Pending) => {
    setPending((list) => list.map((x) => (x.key === p.key ? { ...p, state: "sending", error: undefined } : x)));
    try {
      const data = await postMessage("/api/chat", p, direct, { lang, page: location.pathname });
      if (data.message) setMessages((list) => mergeMessages(list, [data.message!]));
      if (data.conversation) setView(data.conversation as View);
      setActive(true);
      setPending((list) => list.filter((x) => x.key !== p.key));
    } catch (e) {
      console.error("[chat] message could not be sent", e);
      setPending((list) => list.map((x) => (x.key === p.key ? { ...x, state: "failed", error: errorText(e) } : x)));
    }
  };

  const send = (text: string, files: File[]) => {
    const p: Pending = { key: crypto.randomUUID(), text, files, state: "sending" };
    setPending((list) => [...list, p]);
    deliver(p);
  };

  const retry = (key: string) => {
    const p = pending.find((x) => x.key === key);
    if (p) deliver(p);
  };

  const unread = !open && view ? view.unread : 0;
  const askContact = !!view && !view.email && !skipContact && messages.some((m) => m.from === "visitor");

  return (
    <>
      <button
        ref={launcher}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        data-chat-launcher
        aria-label={unread ? d.openUnread(unread) : open ? d.close : d.open}
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-4 right-4 z-30 flex h-14 items-center gap-2.5 rounded-full bg-hallon pl-4 pr-4 text-white shadow-[0_12px_32px_-10px_rgba(216,40,90,0.7)] transition-[background-color,transform] duration-200 hover:bg-hallon-dark active:scale-95 sm:bottom-6 sm:right-6 sm:pr-5 ${
          open ? "max-sm:pointer-events-none max-sm:opacity-0" : ""
        }`}
      >
        <span className="relative grid h-6 w-6 place-items-center">
          <ChatIcon className={`absolute h-6 w-6 transition-[opacity,rotate] duration-200 ${open ? "rotate-45 opacity-0" : ""}`} />
          <svg aria-hidden viewBox="0 0 24 24" className={`absolute h-5 w-5 transition-[opacity,rotate] duration-200 ${open ? "" : "-rotate-45 opacity-0"}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </span>
        <span className="hidden font-semibold sm:inline">{open ? d.close : d.open}</span>
        {unread > 0 && (
          <span aria-hidden className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-granite px-1.5 text-xs font-semibold tabular-nums ring-2 ring-snow">
            {unread}
          </span>
        )}
      </button>

      <section
        id={panelId}
        role="dialog"
        aria-label={d.open}
        inert={!open}
        className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-snow transition-[opacity,translate,scale] duration-200 ease-out sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[392px] sm:origin-bottom-right sm:rounded-[28px] sm:shadow-[0_30px_80px_-24px_rgba(30,43,48,0.5)] sm:ring-1 sm:ring-mist ${
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible translate-y-4 opacity-0 sm:scale-[0.97]"
        }`}
      >
        <header className="flex items-center gap-3 bg-granite px-4 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] text-snow">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-snow text-granite">
            <NPMark className="h-[15px] w-auto" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="font-semibold">{d.studio}</p>
            <p className="text-sm text-mist">{d.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              launcher.current?.focus();
            }}
            aria-label={d.close}
            className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-white/20 transition-colors hover:bg-white/10"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 9l6 6 6-6" className="sm:hidden" />
              <path d="M6 6l12 12M18 6 6 18" className="max-sm:hidden" />
            </svg>
          </button>
        </header>

        <ChatThread
          className="print-layers flex-1 px-4 py-4"
          messages={messages}
          pending={pending}
          mine="visitor"
          locale={locale}
          seenAt={view?.adminSeenAt}
          onRetry={retry}
          labels={{ you: d.you, other: d.studio, seen: d.seen, today: d.today, yesterday: d.yesterday, file: d.file, failed: d.failed, retry: d.retry, sending: d.sending, log: d.log }}
          intro={
            <li className="mb-2 flex flex-col items-start">
              <p className="max-w-[85%] rounded-[20px] rounded-bl-md bg-paper px-4 py-2.5 ring-1 ring-mist">{d.welcome}</p>
            </li>
          }
          footer={
            <>
              {askContact && (
                <ContactCard
                  lang={lang}
                  onSaved={(v) => setView(v)}
                  onSkip={() => {
                    localStorage.setItem(SKIP_CONTACT, "1");
                    setSkipContact(true);
                  }}
                />
              )}
              {view?.email && (
                <ContactNote
                  email={view.email}
                  lang={lang}
                  onChange={() => {
                    // show the form again; the saved address stays until a new one is saved
                    setView({ ...view, email: "" });
                    setSkipContact(false);
                  }}
                />
              )}
              {active && <EndChat lang={lang} onEnded={reset} />}
            </>
          }
        />

        <div className="border-t border-mist bg-paper px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <ChatComposer
            id={inputId}
            autoFocus={open}
            onSend={send}
            fileError={(e: UploadError) => errorText(e)}
            labels={{ placeholder: d.placeholder, send: d.send, attach: d.attach, removeFile: d.removeFile, maxFiles: d.errMaxFiles, empty: d.errEmpty }}
          />
        </div>
      </section>
    </>
  );
}

/** Asks for an e-mail address once, after the first message, so the studio can reply if the visitor leaves. */
function ContactCard({ lang, onSaved, onSkip }: { lang: Lang; onSaved: (v: View) => void; onSkip: () => void }) {
  const d = t(lang).chat;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ids = useId();
  return (
    <form
      className="mt-4 rounded-2xl bg-paper p-4 ring-1 ring-mist"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          const data = await request<{ conversation: View }>("/api/chat", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: f.get("name"), email: f.get("email") }),
          });
          onSaved(data.conversation);
        } catch (err) {
          setError(errorInfo(err).code === "email" ? d.errEmail : d.errNetwork);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="font-semibold">{d.contactTitle}</p>
      <p className="mt-0.5 text-sm text-fjord">{d.contactText}</p>
      <div className="mt-3 grid gap-2">
        <label className="sr-only" htmlFor={`${ids}-name`}>{d.name}</label>
        <input className="field py-2" id={`${ids}-name`} name="name" autoComplete="name" placeholder={d.name} />
        <label className="sr-only" htmlFor={`${ids}-email`}>{d.email}</label>
        <input className="field py-2" id={`${ids}-email`} name="email" type="email" autoComplete="email" required placeholder={d.email} />
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-hallon-dark">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button className="btn btn-primary px-4 py-2.5 text-sm" disabled={busy}>{d.save}</button>
        <button type="button" onClick={onSkip} className="text-sm font-medium text-fjord underline-offset-4 hover:text-granite hover:underline">
          {d.skip}
        </button>
      </div>
    </form>
  );
}

function ContactNote({ email, lang, onChange }: { email: string; lang: Lang; onChange: () => void }) {
  const d = t(lang).chat;
  return (
    <p className="mt-4 text-center text-xs text-fjord">
      {d.contactSaved(email)}{" "}
      <button type="button" onClick={onChange} className="font-medium underline underline-offset-2 hover:text-granite">
        {d.change}
      </button>
    </p>
  );
}

/** Removes the conversation from this browser (the studio keeps it). Two clicks, so it is not done by mistake. */
function EndChat({ lang, onEnded }: { lang: Lang; onEnded: () => void }) {
  const d = t(lang).chat;
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <p className="mt-5 text-center">
      <button
        type="button"
        onClick={async () => {
          if (!armed) return setArmed(true);
          await request("/api/chat", { method: "DELETE" }).catch(() => undefined);
          onEnded();
        }}
        className={`text-xs font-medium underline-offset-4 hover:underline ${armed ? "text-hallon-dark" : "text-fjord"}`}
      >
        {armed ? d.endConfirm : d.end}
      </button>
    </p>
  );
}
