import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import { READ_ONLY, redisEnv } from "./db";
import type { ChatFrom, ChatMessage, ChatStatus, Conversation, Lang } from "./types";

/**
 * Chat storage. Kept apart from the site content so that many visitors can write at the same time:
 *
 * Redis (production)
 *   nordprint:chat:<id>        hash   conversation details
 *   nordprint:chat:<id>:msgs   list   messages as JSON, in order (a message's id is its index)
 *   nordprint:chats            zset   conversation ids by last activity
 *   nordprint:chat-unread      hash   conversation id -> visitor messages the admin has not read
 *   nordprint:chat-rev         int    bumped on every change, so the inbox can poll cheaply
 * Every write is a single atomic Redis command, so concurrent writes never overwrite each other.
 *
 * data/chats.json (local development), written through an in-process queue.
 */

// raw strings in and out: automatic JSON parsing would turn a name like "123" into a number
const redis = redisEnv ? new Redis({ ...redisEnv, automaticDeserialization: false }) : null;
const P = "nordprint:chat";
const INDEX = "nordprint:chats";
const UNREAD = "nordprint:chat-unread";
const REV = "nordprint:chat-rev";
const metaKey = (id: string) => `${P}:${id}`;
const msgsKey = (id: string) => `${P}:${id}:msgs`;

/** On Vercel without Redis nothing can be stored, so the chat is switched off. */
export const chatEnabled = !READ_ONLY;

const ID = /^[a-f0-9]{20}$/;
export const isChatId = (v: unknown): v is string => typeof v === "string" && ID.test(v);

type StoredMessage = Omit<ChatMessage, "id">;
type Meta = Omit<Conversation, "unreadAdmin">;

/** HGETALL without automatic parsing answers with a flat [field, value, field, value] list. */
function hash(raw: unknown): Record<string, unknown> | null {
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    const out: Record<string, unknown> = {};
    for (let i = 0; i + 1 < raw.length; i += 2) out[String(raw[i])] = raw[i + 1];
    return out;
  }
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
}

const preview = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 140);

function parseMeta(raw: Record<string, unknown> | null, unreadAdmin: unknown): Conversation | null {
  if (!raw || !raw.id) return null;
  const s = (k: string) => (raw[k] == null ? "" : String(raw[k]));
  return {
    id: s("id"),
    createdAt: s("createdAt"),
    updatedAt: s("updatedAt"),
    lang: s("lang") === "en" ? "en" : "sv",
    name: s("name"),
    email: s("email"),
    page: s("page"),
    status: s("status") === "closed" ? "closed" : "open",
    preview: s("preview"),
    lastFrom: s("lastFrom") === "admin" ? "admin" : s("lastFrom") === "visitor" ? "visitor" : "",
    unreadAdmin: Number(unreadAdmin) || 0,
    unreadVisitor: Number(raw.unreadVisitor) || 0,
    adminSeenAt: s("adminSeenAt"),
    visitorSeenAt: s("visitorSeenAt"),
  };
}

function parseMessage(raw: unknown, id: number): ChatMessage | null {
  try {
    const m = (typeof raw === "string" ? JSON.parse(raw) : raw) as StoredMessage;
    return { id, at: String(m.at), from: m.from === "admin" ? "admin" : "visitor", text: String(m.text ?? ""), files: Array.isArray(m.files) ? m.files.map(String) : [] };
  } catch {
    return null;
  }
}

/* ---------- local file store ---------- */

type FileData = { rev: number; items: { meta: Meta; unreadAdmin: number; messages: StoredMessage[] }[] };
const FILE = path.join(process.cwd(), "data", "chats.json");
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<FileData> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as FileData;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    return { rev: 0, items: [] };
  }
}

/** Serialised read-modify-write of data/chats.json. */
function change<T>(fn: (d: FileData) => T): Promise<T> {
  const run = queue.then(async () => {
    const d = await load();
    const result = fn(d);
    d.rev++;
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(d, null, 2), "utf8");
    await fs.rename(tmp, FILE);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

async function read() {
  await queue;
  return load();
}

/* ---------- API ---------- */

export async function createConversation(input: { lang: Lang; name: string; email: string; page: string }): Promise<Conversation> {
  const now = new Date().toISOString();
  const meta: Meta = {
    id: crypto.randomUUID().replace(/-/g, "").slice(0, 20),
    createdAt: now,
    updatedAt: now,
    lang: input.lang,
    name: input.name,
    email: input.email,
    page: input.page,
    status: "open",
    preview: "",
    lastFrom: "",
    unreadVisitor: 0,
    adminSeenAt: "",
    visitorSeenAt: "",
  };
  if (redis) {
    const tx = redis.multi();
    tx.hset(metaKey(meta.id), meta);
    tx.zadd(INDEX, { score: Date.now(), member: meta.id });
    tx.incr(REV);
    await tx.exec();
  } else {
    await change((d) => d.items.unshift({ meta, unreadAdmin: 0, messages: [] }));
  }
  return { ...meta, unreadAdmin: 0 };
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (!isChatId(id)) return null;
  if (redis) {
    const [meta, unread] = await redis.multi().hgetall(metaKey(id)).hget(UNREAD, id).exec<[unknown, unknown]>();
    return parseMeta(hash(meta), unread);
  }
  const item = (await read()).items.find((x) => x.meta.id === id);
  return item ? { ...item.meta, unreadAdmin: item.unreadAdmin } : null;
}

/** Messages with an id >= `after`. */
export async function getMessages(id: string, after = 0): Promise<ChatMessage[]> {
  const from = Math.max(0, Math.floor(after) || 0);
  let raw: unknown[];
  if (redis) raw = await redis.lrange(msgsKey(id), from, -1);
  else raw = ((await read()).items.find((x) => x.meta.id === id)?.messages ?? []).slice(from);
  return raw.map((m, i) => parseMessage(m, from + i)).filter((m): m is ChatMessage => !!m);
}

export async function addMessage(id: string, from: ChatFrom, text: string, files: string[]): Promise<ChatMessage> {
  const msg: StoredMessage = { at: new Date().toISOString(), from, text, files };
  const update = { updatedAt: msg.at, lastFrom: from, status: "open" as ChatStatus, preview: preview(text) };
  if (redis) {
    const length = await redis.rpush(msgsKey(id), JSON.stringify(msg));
    const tx = redis.multi();
    tx.hset(metaKey(id), update);
    if (from === "visitor") tx.hincrby(UNREAD, id, 1);
    else tx.hincrby(metaKey(id), "unreadVisitor", 1);
    tx.zadd(INDEX, { score: Date.now(), member: id });
    tx.incr(REV);
    await tx.exec();
    return { id: Number(length) - 1, ...msg };
  }
  return change((d) => {
    const item = d.items.find((x) => x.meta.id === id);
    if (!item) throw new Error("Conversation not found");
    item.messages.push(msg);
    Object.assign(item.meta, update);
    if (from === "visitor") item.unreadAdmin++;
    else item.meta.unreadVisitor++;
    // most recent first
    d.items = [item, ...d.items.filter((x) => x !== item)];
    return { id: item.messages.length - 1, ...msg };
  });
}

/** The admin opened the conversation, or the visitor saw the studio's replies. */
export async function markSeen(id: string, by: ChatFrom) {
  const now = new Date().toISOString();
  if (redis) {
    const tx = redis.multi();
    if (by === "admin") {
      tx.hdel(UNREAD, id);
      tx.hset(metaKey(id), { adminSeenAt: now });
      tx.incr(REV);
    } else {
      tx.hset(metaKey(id), { unreadVisitor: 0, visitorSeenAt: now });
    }
    await tx.exec();
    return;
  }
  await change((d) => {
    const item = d.items.find((x) => x.meta.id === id);
    if (!item) return;
    if (by === "admin") {
      item.unreadAdmin = 0;
      item.meta.adminSeenAt = now;
    } else {
      item.meta.unreadVisitor = 0;
      item.meta.visitorSeenAt = now;
    }
  });
}

export async function updateConversation(id: string, patch: Partial<Pick<Conversation, "name" | "email" | "status">>) {
  if (redis) {
    await redis.multi().hset(metaKey(id), patch).incr(REV).exec();
    return;
  }
  await change((d) => {
    const item = d.items.find((x) => x.meta.id === id);
    if (item) Object.assign(item.meta, patch);
  });
}

/** Most recently active first. */
export async function listConversations(limit = 200): Promise<Conversation[]> {
  if (redis) {
    const ids = (await redis.zrange<string[]>(INDEX, 0, limit - 1, { rev: true })).map(String);
    if (ids.length === 0) return [];
    const tx = redis.pipeline();
    ids.forEach((id) => tx.hgetall(metaKey(id)));
    tx.hgetall(UNREAD);
    const res = await tx.exec<unknown[]>();
    const unread = hash(res.pop()) ?? {};
    return res.map((m, i) => parseMeta(hash(m), unread[ids[i]])).filter((c): c is Conversation => !!c);
  }
  return (await read()).items.slice(0, limit).map((x) => ({ ...x.meta, unreadAdmin: x.unreadAdmin }));
}

/** `rev` changes whenever anything in the inbox changes; `unread` is the number of unread visitor messages. */
export async function chatSummary(): Promise<{ rev: number; unread: number }> {
  if (redis) {
    const [rev, counts] = await redis.multi().get(REV).hvals(UNREAD).exec<[unknown, unknown[]]>();
    return { rev: Number(rev) || 0, unread: (counts ?? []).reduce<number>((n, c) => n + (Number(c) || 0), 0) };
  }
  const d = await read();
  return { rev: d.rev, unread: d.items.reduce((n, x) => n + x.unreadAdmin, 0) };
}

/** Deletes a conversation and returns the files that were attached to it. */
export async function deleteConversation(id: string): Promise<string[]> {
  const files = (await getMessages(id)).flatMap((m) => m.files);
  if (redis) {
    await redis.multi().del(metaKey(id), msgsKey(id)).zrem(INDEX, id).hdel(UNREAD, id).incr(REV).exec();
  } else {
    await change((d) => {
      d.items = d.items.filter((x) => x.meta.id !== id);
    });
  }
  return files;
}
