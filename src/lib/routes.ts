import type { Lang } from "./types";

export type Page = "home" | "products" | "order" | "terms";

const SEGMENTS: Record<Lang, Record<Page, string>> = {
  sv: { home: "", products: "produkter", order: "bestall", terms: "villkor" },
  en: { home: "", products: "products", order: "order", terms: "terms" },
};

export const CATEGORY_PARAM: Record<Lang, string> = { sv: "kategori", en: "category" };
export const PRODUCT_PARAM: Record<Lang, string> = { sv: "produkt", en: "product" };
export const ANCHORS: Record<Lang, { how: string; faq: string }> = {
  sv: { how: "sa-funkar-det", faq: "fragor" },
  en: { how: "how-it-works", faq: "faq" },
};

/** Public URL of a page. Swedish lives at the root, English under /en. */
export function href(lang: Lang, page: Page, slug?: string) {
  const prefix = lang === "en" ? "/en" : "";
  const seg = SEGMENTS[lang][page];
  const path = [prefix, seg, slug].filter(Boolean).join("/");
  return path.startsWith("/") ? path : `/${path}` || "/";
}

/** Swedish public segment -> internal route segment, used by the middleware. */
export const SV_TO_INTERNAL: Record<string, string> = { produkter: "products", bestall: "order", villkor: "terms" };
export const INTERNAL_TO_SV: Record<string, string> = Object.fromEntries(Object.entries(SV_TO_INTERNAL).map(([a, b]) => [b, a]));

/** Equivalent URL in the other language, used by the language switcher. */
export function switchPath(pathname: string): { sv: string; en: string } {
  const parts = pathname.split("/").filter(Boolean);
  const isEn = parts[0] === "en";
  const rest = isEn ? parts.slice(1) : parts;
  const internal = isEn ? rest : [SV_TO_INTERNAL[rest[0]] ?? rest[0], ...rest.slice(1)].filter(Boolean);
  const svParts = internal.length ? [INTERNAL_TO_SV[internal[0]] ?? internal[0], ...internal.slice(1)] : [];
  return { sv: "/" + svParts.join("/"), en: "/" + ["en", ...internal].join("/") };
}
