"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "./types";
import { moveFilesToBlob } from "./upload-client";
import { MAX_CHAT_FILES, UploadError, type BlobMode } from "./upload-rules";

/** A message typed in this browser that is not confirmed by the server yet. */
export type Pending = { key: string; text: string; files: File[]; state: "sending" | "failed"; error?: string };

/** Error answer of a chat endpoint (see chat-input.ts). */
export class ChatRequestError extends Error {
  constructor(public code: string, public body: { kind?: string; detail?: string; mb?: number } = {}, public status = 0) {
    super(code);
  }
}

/** Runs `fn` every `ms` while the tab is visible, and right away when the tab becomes visible again. */
export function usePoll(fn: () => unknown, ms: number, active = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    let gen = 0;
    const tick = async (g: number) => {
      if (document.visibilityState === "visible") {
        try {
          await ref.current();
        } catch {
          // a failed poll is retried on the next tick
        }
      }
      if (g === gen) timer = setTimeout(() => tick(g), ms);
    };
    timer = setTimeout(() => tick(gen), ms);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      tick(++gen);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      gen = -1;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ms, active]);
}

/** Adds new messages to a list, without duplicates, in order. */
export function mergeMessages(list: ChatMessage[], incoming: ChatMessage[]) {
  if (incoming.length === 0) return list;
  const byId = new Map(list.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export const nextId = (list: ChatMessage[]) => (list.length ? list[list.length - 1].id + 1 : 0);

/** Posts a message with attachments; on Vercel the files go straight to Blob first. */
export async function postMessage(url: string, p: Pending, direct: BlobMode, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set("text", p.text);
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  for (const f of p.files) form.append("files", f);
  if (direct && p.files.length) await moveFilesToBlob(form, "files", "chat", direct, MAX_CHAT_FILES);
  return request<{ message: ChatMessage | null; conversation?: unknown }>(url, { method: "POST", body: form });
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new ChatRequestError("network");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ChatRequestError(String(data.error ?? "network"), data, res.status);
  return data as T;
}

/** Turns an upload or request error into the code used by the dictionaries. */
export function errorInfo(e: unknown): { code: string; kind?: string; detail?: string; mb?: number } {
  if (e instanceof UploadError) return { code: "file", kind: e.kind, detail: e.detail, mb: e.mb };
  if (e instanceof ChatRequestError) return { code: e.code, ...e.body };
  return { code: "network" };
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function dayLabel(iso: string, locale: string, today: string, yesterday: string) {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return today;
  if (sameDay(d, new Date(now.getTime() - 864e5))) return yesterday;
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) }).format(d);
}

export function timeLabel(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Short relative time for lists: 14:05 today, "Igår", or a date. */
export function listTime(iso: string, locale: string, yesterday: string) {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return timeLabel(iso, locale);
  if (sameDay(d, new Date(now.getTime() - 864e5))) return yesterday;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
}

export const isImage = (name: string) => /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(name);

export const fileName = (url: string) => decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? url);
