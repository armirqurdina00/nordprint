"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { mutate, newId } from "@/lib/db";
import { collectUploads, deleteUpload, UploadError } from "@/lib/uploads";
import { getAdminT } from "@/lib/admin-lang";
import { uploadErrorMessage } from "@/lib/admin-i18n";
import { slugify } from "@/lib/format";
import type { FaqItem, InquiryStatus, Lang, Product, ProductText, SettingsText, TextItem } from "@/lib/types";

export type FormState = { error?: string; saved?: number };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function refresh() {
  revalidatePath("/", "layout");
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  if (!checkPassword(str(form, "password"))) return { error: (await getAdminT()).errors.wrongPassword };
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------- Produkter ---------- */

function productText(form: FormData, lang: Lang): ProductText {
  const g = (k: string) => str(form, `${lang}_${k}`);
  return {
    name: g("name"),
    tagline: g("tagline"),
    description: g("description"),
    priceNote: g("priceNote"),
    category: g("category"),
    material: g("material"),
    dimensions: g("dimensions"),
    leadTime: g("leadTime"),
  };
}

export async function saveProduct(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const t = await getAdminT();
  const id = str(form, "id");
  const sv = productText(form, "sv");
  const en = productText(form, "en");
  if (!sv.name) return { error: t.errors.nameRequired };
  const rawPrice = str(form, "price").replace(",", ".").replace(/\s/g, "");
  const price = rawPrice === "" ? null : Number(rawPrice);
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: t.errors.price };
  const slug = slugify(str(form, "slug") || sv.name);
  if (!slug) return { error: t.errors.slug };

  let images: string[] = JSON.parse(str(form, "images") || "[]");
  const removed: string[] = JSON.parse(str(form, "removedImages") || "[]");
  try {
    images.push(...(await collectUploads(form, "newImages", "products")));
  } catch (e) {
    if (e instanceof UploadError) return { error: uploadErrorMessage(t, e) };
    throw e;
  }
  images = images.filter((u) => !removed.includes(u));

  const colors = str(form, "colors")
    .split(/[\s,]+/)
    .filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));

  const result = await mutate((d) => {
    if (d.products.some((p) => p.slug === slug && p.id !== id)) return "dup" as const;
    const now = new Date().toISOString();
    const existing = d.products.find((p) => p.id === id);
    const data: Omit<Product, "id" | "createdAt" | "order"> = {
      slug,
      price,
      images,
      colors,
      instagram: str(form, "instagram"),
      featured: form.get("featured") === "on",
      published: form.get("published") === "on",
      updatedAt: now,
      sv,
      en,
    };
    if (existing) {
      Object.assign(existing, data);
      return existing.id;
    }
    const order = Math.max(0, ...d.products.map((p) => p.order)) + 1;
    const created: Product = { ...data, id: newId(), createdAt: now, order };
    d.products.push(created);
    return created.id;
  });
  if (result === "dup") return { error: t.errors.slugTaken(slug) };
  // product photos shipped with the site live in /public and are never deleted
  await Promise.all(removed.map(deleteUpload));
  refresh();
  if (!id) redirect(`/admin/produkter/${result}?skapad=1`);
  return { saved: Date.now() };
}

export async function deleteProduct(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const images = await mutate((d) => {
    const p = d.products.find((x) => x.id === id);
    d.products = d.products.filter((x) => x.id !== id);
    return p?.images ?? [];
  });
  await Promise.all(images.map(deleteUpload));
  refresh();
  redirect("/admin/produkter");
}

export async function moveProduct(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const dir = str(form, "dir") === "up" ? -1 : 1;
  await mutate((d) => {
    const list = [...d.products].sort((a, b) => a.order - b.order);
    const i = list.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((p, k) => (p.order = k + 1));
  });
  refresh();
}

export async function togglePublished(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  await mutate((d) => {
    const p = d.products.find((x) => x.id === id);
    if (p) p.published = !p.published;
  });
  refresh();
}

/* ---------- Förfrågningar ---------- */

const STATUSES: InquiryStatus[] = ["ny", "pågår", "klar", "arkiverad"];

export async function updateInquiry(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const status = str(form, "status") as InquiryStatus;
  if (!STATUSES.includes(status)) return { error: (await getAdminT()).errors.unknownStatus };
  await mutate((d) => {
    const q = d.inquiries.find((x) => x.id === id);
    if (q) {
      q.status = status;
      q.notes = str(form, "notes");
    }
  });
  revalidatePath("/admin", "layout");
  return { saved: Date.now() };
}

export async function deleteInquiry(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const files = await mutate((d) => {
    const q = d.inquiries.find((x) => x.id === id);
    d.inquiries = d.inquiries.filter((x) => x.id !== id);
    return q?.files ?? [];
  });
  await Promise.all(files.map(deleteUpload));
  revalidatePath("/admin", "layout");
  redirect("/admin/forfragningar");
}

/* ---------- Innehåll ---------- */

function parseList<T>(raw: string, keys: (keyof T)[]): T[] {
  const list = JSON.parse(raw || "[]") as T[];
  return list.filter((item) => keys.some((k) => String(item[k] ?? "").trim()));
}

function settingsText(form: FormData, lang: Lang): SettingsText {
  const g = (k: string) => str(form, `${lang}_${k}`);
  return {
    announcement: g("announcement"),
    heroTitle: g("heroTitle"),
    heroText: g("heroText"),
    aboutTitle: g("aboutTitle"),
    aboutText: g("aboutText"),
    services: parseList<TextItem>(g("services"), ["title", "text"]),
    steps: parseList<TextItem>(g("steps"), ["title", "text"]),
    faq: parseList<FaqItem>(g("faq"), ["q", "a"]),
    policies: parseList<TextItem>(g("policies"), ["title", "text"]),
  };
}

export async function saveSettings(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const t = await getAdminT();
  const brandName = str(form, "brandName");
  if (!brandName) return { error: t.errors.brandRequired };

  let newLogo: string | null = null;
  try {
    newLogo = (await collectUploads(form, "logoFile", "site", 1))[0] ?? null;
  } catch (e) {
    if (e instanceof UploadError) return { error: uploadErrorMessage(t, e) };
    throw e;
  }
  const removeLogo = form.get("removeLogo") === "on";

  const oldLogo = await mutate((d) => {
    const previous = d.settings.logo;
    d.settings = {
      brandName,
      logo: newLogo ?? (removeLogo ? "" : previous),
      instagram: str(form, "instagram"),
      email: str(form, "email"),
      location: str(form, "location"),
      orgNumber: str(form, "orgNumber"),
      sv: settingsText(form, "sv"),
      en: settingsText(form, "en"),
    };
    return previous !== d.settings.logo ? previous : "";
  });
  if (oldLogo) await deleteUpload(oldLogo);
  refresh();
  return { saved: Date.now() };
}
