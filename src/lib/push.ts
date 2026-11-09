import "server-only";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import { sendNotification } from "web-push";
import { adminT } from "./admin-i18n";
import { redisEnv } from "./db";
import type { ChatFrom, ChatMessage, Conversation, Lang } from "./types";

/**
 * Web push for the chat. Who gets what:
 *   visitor writes -> every device where the studio turned notifications on
 *   studio replies -> the devices the visitor turned them on for, in that conversation
 * Nobody is notified about a conversation they are looking at right now (see markActive).
 *
 * Redis (production)
 *   nordprint:push:admin       hash   endpoint hash -> subscription
 *   nordprint:push:chat:<id>   hash   endpoint hash -> subscription
 *   nordprint:chat-active:<id>:<side>   short-lived, set while that side has the conversation open
 * data/push.json (local development)
 */

export type PushSubscriber = { endpoint: string; keys: { p256dh: string; auth: string }; lang: Lang };

const redis = redisEnv ? new Redis(redisEnv) : null;
const ADMIN = "nordprint:push:admin";
const chatKey = (id: string) => `nordprint:push:chat:${id}`;
const activeKey = (id: string, side: ChatFrom) => `nordprint:chat-active:${id}:${side}`;

const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const subject = process.env.VAPID_SUBJECT || (productionUrl ? `https://${productionUrl}` : "https://nordprint.example");

/** Empty when push is not set up: the interface then offers no notifications. */
export const pushPublicKey = publicKey && privateKey ? publicKey : "";

/** Slightly longer than the slowest chat poll, so one late poll does not count as having left. */
const ACTIVE_SECONDS = 10;

/** Only real push services: subscriptions come from the browser, and the server sends a request to the endpoint. */
const PUSH_HOST = /(^|\.)(googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;

/** Reads a browser PushSubscription, or null if it is not a usable one. */
export function readSubscription(raw: unknown, lang: Lang): PushSubscriber | null {
  const s = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const { endpoint, keys } = s ?? {};
  if (typeof endpoint !== "string" || endpoint.length > 2000) return null;
  if (typeof keys?.p256dh !== "string" || typeof keys.auth !== "string") return null;
  if (keys.p256dh.length > 200 || keys.auth.length > 100) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || !PUSH_HOST.test(url.hostname)) return null;
  } catch {
    return null;
  }
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, lang };
}

const field = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex").slice(0, 32);

/* ---------- local file store ---------- */

type FileData = Record<string, Record<string, PushSubscriber>>;
const FILE = path.join(process.cwd(), "data", "push.json");
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<FileData> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as FileData;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    return {};
  }
}

function change(fn: (d: FileData) => void) {
  const run = queue.then(async () => {
    const d = await load();
    fn(d);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(d, null, 2), "utf8");
  });
  queue = run.catch(() => undefined);
  return run;
}

// local development only; survives Next.js loading this module once per route
const localActive = ((globalThis as { __npChatActive?: Map<string, number> }).__npChatActive ??= new Map<string, number>());

/* ---------- storage ---------- */

async function save(key: string, sub: PushSubscriber) {
  if (redis) await redis.hset(key, { [field(sub.endpoint)]: JSON.stringify(sub) });
  else await change((d) => void ((d[key] ??= {})[field(sub.endpoint)] = sub));
}

async function remove(key: string, endpoint: string) {
  if (redis) await redis.hdel(key, field(endpoint));
  else await change((d) => void delete d[key]?.[field(endpoint)]);
}

async function list(key: string): Promise<PushSubscriber[]> {
  if (!redis) return Object.values((await load())[key] ?? {});
  // the client parses JSON values by itself
  const all = await redis.hgetall<Record<string, PushSubscriber | string>>(key);
  return Object.values(all ?? {}).map((v) => (typeof v === "string" ? (JSON.parse(v) as PushSubscriber) : v));
}

export const saveAdminSubscription = (sub: PushSubscriber) => save(ADMIN, sub);
export const removeAdminSubscription = (endpoint: string) => remove(ADMIN, endpoint);
export const saveChatSubscription = (id: string, sub: PushSubscriber) => save(chatKey(id), sub);
export const removeChatSubscription = (id: string, endpoint: string) => remove(chatKey(id), endpoint);

/** The conversation was ended or deleted: its visitor gets no more notifications. */
export async function clearChatSubscriptions(id: string) {
  if (redis) await redis.del(chatKey(id));
  else await change((d) => void delete d[chatKey(id)]);
}

/** Called from the chat polls, which only run while the conversation is open in a visible tab. */
export async function markActive(id: string, side: ChatFrom) {
  if (!pushPublicKey) return;
  if (redis) await redis.set(activeKey(id, side), 1, { ex: ACTIVE_SECONDS });
  else localActive.set(activeKey(id, side), Date.now() + ACTIVE_SECONDS * 1000);
}

async function isActive(id: string, side: ChatFrom) {
  if (redis) return (await redis.exists(activeKey(id, side))) > 0;
  return (localActive.get(activeKey(id, side)) ?? 0) > Date.now();
}

/* ---------- sending ---------- */

async function send(key: string, sub: PushSubscriber, payload: object) {
  try {
    await sendNotification(sub, JSON.stringify(payload), {
      vapidDetails: { subject, publicKey, privateKey },
      TTL: 60 * 60 * 24,
      urgency: "high",
      timeout: 8000,
    });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // the browser unsubscribed or the app was removed
    if (status === 404 || status === 410) await remove(key, sub.endpoint);
    else console.error("[push] could not send", status ?? err);
  }
}

/** Tells the other side about a new message. Never throws: the message itself is already saved. */
export async function notifyNewMessage(conversation: Conversation, message: ChatMessage) {
  if (!pushPublicKey) return;
  try {
    const { id } = conversation;
    const to: ChatFrom = message.from === "visitor" ? "admin" : "visitor";
    if (await isActive(id, to)) return;
    const key = to === "admin" ? ADMIN : chatKey(id);
    const subs = await list(key);
    await Promise.all(
      subs.map((sub) => {
        const t = adminT(sub.lang).chat;
        const body = message.text.replace(/\s+/g, " ").trim().slice(0, 140) || message.product?.name || t.attachment;
        return to === "admin"
          ? send(key, sub, { title: conversation.name || t.visitor(id), body, tag: `chat-${id}`, url: `/admin/chatt?c=${id}` })
          : send(key, sub, { title: "NordPrint Studio", body, tag: `chat-${id}`, url: `${conversation.lang === "en" ? "/en" : "/"}?chat=1` });
      })
    );
  } catch (err) {
    console.error("[push] notification failed", err);
  }
}
