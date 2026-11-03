"use client";

import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import type { ChatFrom, ChatMessage } from "@/lib/types";
import { dayLabel, fileName, isImage, timeLabel, type Pending } from "@/lib/chat-client";
import { usePreviews } from "@/components/site/FilePicker";

export type ThreadLabels = {
  you: string;
  other: string;
  seen: string;
  today: string;
  yesterday: string;
  file: string;
  failed: string;
  retry: string;
  sending: string;
  log: string;
};

const URL_RE = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]])/g;

/** Message text with links made clickable. */
function Text({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" className={`underline underline-offset-2 ${mine ? "decoration-snow/60" : "decoration-fjord/50"} break-all`}>
            {p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

function FileIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" />
    </svg>
  );
}

/** Attachments of one message: photos as thumbnails, other files as chips. */
function Attachments({ items, mine, fileLabel }: { items: { href: string; name: string; src?: string }[]; mine: boolean; fileLabel: string }) {
  if (items.length === 0) return null;
  return (
    <div className={`flex max-w-[85%] flex-wrap gap-1.5 ${mine ? "justify-end self-end" : "self-start"}`}>
      {items.map((f, i) =>
        f.src ? (
          <a key={i} href={f.href || undefined} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl ring-1 ring-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.src} alt={f.name} className={`${items.length > 1 ? "h-28 w-28" : "max-h-60 w-auto max-w-full"} object-cover`} />
          </a>
        ) : (
          <a
            key={i}
            href={f.href || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex max-w-full items-center gap-2 rounded-2xl bg-paper px-3 py-2 text-granite ring-1 ring-mist hover:ring-granite"
          >
            <FileIcon />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{f.name}</span>
              <span className="block text-xs text-fjord">{fileLabel}</span>
            </span>
          </a>
        )
      )}
    </div>
  );
}

function PendingMessage({ p, labels, onRetry }: { p: Pending; labels: ThreadLabels; onRetry: (key: string) => void }) {
  const previews = usePreviews(p.files);
  return (
    <li className="flex flex-col items-end gap-1.5">
      <Attachments mine fileLabel={labels.file} items={p.files.map((f, i) => ({ href: "", name: f.name, src: previews[i] || undefined }))} />
      {p.text && (
        <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-granite px-4 py-2.5 text-snow ${p.state === "sending" ? "opacity-70" : ""}`}>
          <Text text={p.text} mine />
        </p>
      )}
      {p.state === "sending" ? (
        <p className="text-xs text-fjord">{labels.sending}</p>
      ) : (
        <p role="alert" className="max-w-[85%] text-right text-xs font-medium text-hallon-dark">
          {labels.failed} {p.error}{" "}
          <button type="button" onClick={() => onRetry(p.key)} className="font-semibold underline underline-offset-2">
            {labels.retry}
          </button>
        </p>
      )}
    </li>
  );
}

/**
 * Scrollable message list shared by the website chat and the admin inbox.
 * `mine` decides which side is drawn as "you"; `seenAt` is when the other side last looked.
 */
export default function ChatThread({
  messages,
  pending,
  mine,
  locale,
  labels,
  seenAt,
  onRetry,
  intro,
  footer,
  className = "",
}: {
  messages: ChatMessage[];
  pending: Pending[];
  mine: ChatFrom;
  locale: string;
  labels: ThreadLabels;
  seenAt?: string;
  onRetry: (key: string) => void;
  intro?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  // follow new messages, unless the reader has scrolled up to read older ones
  useLayoutEffect(() => {
    const el = box.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending, footer]);

  // photos load after the text, which makes the list taller: stay at the bottom while that happens
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || !list.current) return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(list.current);
    return () => ro.disconnect();
  }, []);

  const lastMine = [...messages].reverse().find((m) => m.from === mine);
  const seen = !!lastMine && !!seenAt && seenAt >= lastMine.at;

  return (
    <div
      ref={box}
      onScroll={(e) => {
        const el = e.currentTarget;
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      role="log"
      aria-label={labels.log}
      className={`overflow-y-auto overscroll-contain ${className}`}
    >
      <ol ref={list} className="flex flex-col gap-1">
        {intro}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const isMine = m.from === mine;
          const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
          const endsRun = !next || next.from !== m.from || new Date(next.at).getTime() - new Date(m.at).getTime() > 5 * 60_000;
          const startsRun = newDay || !prev || prev.from !== m.from;
          return (
            <Fragment key={m.id}>
              {newDay && (
                <li className="my-3 text-center text-xs font-medium text-fjord first:mt-0">
                  <span className="rounded-full bg-paper/80 px-3 py-1 ring-1 ring-mist">{dayLabel(m.at, locale, labels.today, labels.yesterday)}</span>
                </li>
              )}
              <li className={`flex flex-col gap-1.5 ${isMine ? "items-end" : "items-start"} ${startsRun && !newDay ? "mt-2.5" : ""}`}>
                <span className="sr-only">
                  {isMine ? labels.you : labels.other}, {timeLabel(m.at, locale)}:
                </span>
                <Attachments mine={isMine} fileLabel={labels.file} items={m.files.map((f) => ({ href: f, name: fileName(f), src: isImage(f) ? f : undefined }))} />
                {m.text && (
                  <p
                    className={`max-w-[85%] whitespace-pre-wrap break-words px-4 py-2.5 ${
                      isMine ? "rounded-[20px] rounded-br-md bg-granite text-snow" : "rounded-[20px] rounded-bl-md bg-paper text-granite ring-1 ring-mist"
                    }`}
                  >
                    <Text text={m.text} mine={isMine} />
                  </p>
                )}
                {endsRun && (
                  <p className="mb-1 px-1 text-xs tabular-nums text-fjord" aria-hidden={!(m === lastMine && seen)}>
                    {timeLabel(m.at, locale)}
                    {m === lastMine && seen && <span> · {labels.seen}</span>}
                  </p>
                )}
              </li>
            </Fragment>
          );
        })}
        {pending.map((p) => (
          <PendingMessage key={p.key} p={p} labels={labels} onRetry={onRetry} />
        ))}
      </ol>
      {footer}
    </div>
  );
}
