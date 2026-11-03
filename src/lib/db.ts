/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Content, Product, ProductText, SettingsText } from "./types";
import { Redis } from "@upstash/redis";
import seed from "../../data/seed.json";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "content.json");

let queue: Promise<unknown> = Promise.resolve();
let seeding: Promise<void> | null = null;

/**
 * Storage backends:
 * - Upstash Redis (Vercel marketplace) when its env vars are present, used on Vercel
 * - data/content.json on local disk otherwise
 */
const redisUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
/** Connection settings, shared with the chat store (which uses its own client without automatic JSON parsing). */
export const redisEnv = redisUrl && redisToken ? { url: redisUrl, token: redisToken } : null;
const redis = redisEnv ? new Redis(redisEnv) : null;
const KEY = "nordprint:content";
export const READ_ONLY = !redis && !!process.env.VERCEL;

export const storageMode = redis ? "redis" : READ_ONLY ? "read-only" : "file";

async function readRaw(): Promise<Content> {
  if (redis) {
    const stored = await redis.get<Record<string, unknown>>(KEY);
    if (stored) return normalize(stored);
    await redis.set(KEY, seed, { nx: true });
    return normalize((await redis.get<Record<string, unknown>>(KEY)) ?? structuredClone(seed));
  }
  if (READ_ONLY) return normalize(structuredClone(seed));
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return normalize(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // first run: create content.json from the seed exactly once
    seeding ??= writeRaw(structuredClone(seed) as Content).finally(() => (seeding = null));
    await seeding;
    return readRaw();
  }
}

const EMPTY_PRODUCT_TEXT: ProductText = { name: "", tagline: "", description: "", priceNote: "", category: "", material: "", dimensions: "", leadTime: "" };
const EMPTY_SETTINGS_TEXT: SettingsText = { announcement: "", heroTitle: "", heroText: "", aboutTitle: "", aboutText: "", services: [], steps: [], faq: [], policies: [] };

/** Upgrades content saved by older versions (Swedish-only fields at the top level) to the bilingual shape. */
function normalize(data: Record<string, any>): Content {
  const s = data.settings ?? {};
  if (!s.sv) {
    const sv = { ...EMPTY_SETTINGS_TEXT };
    for (const k of Object.keys(sv) as (keyof SettingsText)[]) if (k in s) (sv as any)[k] = s[k];
    data.settings = { brandName: s.brandName ?? "", logo: "", instagram: s.instagram ?? "", email: s.email ?? "", location: s.location ?? "", orgNumber: s.orgNumber ?? "", sv, en: { ...EMPTY_SETTINGS_TEXT } };
  }
  data.settings.logo ??= "";
  data.settings.en ??= { ...EMPTY_SETTINGS_TEXT };
  data.products = (data.products ?? []).map((p: any): Product => {
    if (p.sv) return { instagram: "", ...p, en: { ...EMPTY_PRODUCT_TEXT, ...p.en } };
    const sv = { ...EMPTY_PRODUCT_TEXT };
    for (const k of Object.keys(sv) as (keyof ProductText)[]) if (k in p) sv[k] = p[k];
    return {
      id: p.id, slug: p.slug, price: p.price ?? null, images: p.images ?? [], colors: p.colors ?? [], instagram: p.instagram ?? "",
      featured: !!p.featured, published: !!p.published, order: p.order ?? 0, createdAt: p.createdAt, updatedAt: p.updatedAt,
      sv, en: { ...EMPTY_PRODUCT_TEXT },
    };
  });
  data.inquiries = (data.inquiries ?? []).map((q: any) => ({ lang: "sv", ...q }));
  return data as Content;
}

async function writeRaw(data: Content) {
  if (redis) {
    await redis.set(KEY, data);
    return;
  }
  if (READ_ONLY) {
    throw new Error("Ingen databas är kopplad. Lägg till Upstash Redis i Vercel-projektet (Storage) och gör en ny deploy.");
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

/** Allows `limit` hits per window for a key. Without Redis (local dev) everything is allowed. */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  if (!redis) return true;
  const k = `nordprint:rl:${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const n = await redis.incr(k);
  if (n === 1) await redis.expire(k, windowSeconds);
  return n <= limit;
}

export async function getContent(): Promise<Content> {
  await queue;
  return readRaw();
}

/** Serialised read-modify-write so concurrent requests never clobber each other. */
export function mutate<T>(fn: (data: Content) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const data = await readRaw();
    const result = await fn(data);
    await writeRaw(data);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function getSettings() {
  return (await getContent()).settings;
}

export async function getPublishedProducts() {
  const { products } = await getContent();
  return products.filter((p) => p.published).sort((a, b) => a.order - b.order);
}

export async function getProductBySlug(slug: string) {
  const { products } = await getContent();
  return products.find((p) => p.slug === slug && p.published) ?? null;
}

export function newId() {
  return crypto.randomUUID().slice(0, 8) + Date.now().toString(36);
}
