import type { Lang, Product, ProductText, Settings, SettingsText } from "./types";

/** English falls back to Swedish field by field, so an untranslated field never shows up empty. */
export function productText(p: Product, lang: Lang): ProductText {
  if (lang === "sv") return p.sv;
  const out = { ...p.sv };
  for (const k of Object.keys(out) as (keyof ProductText)[]) {
    if (p.en?.[k]?.trim()) out[k] = p.en[k];
  }
  return out;
}

export function settingsText(s: Settings, lang: Lang): SettingsText {
  if (lang === "sv") return s.sv;
  const out = { ...s.sv } as SettingsText;
  for (const k of Object.keys(out) as (keyof SettingsText)[]) {
    const v = s.en?.[k];
    if (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim()) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  // the announcement is time-sensitive, so never show the Swedish one on the English site
  out.announcement = s.en?.announcement ?? "";
  return out;
}

export type LocalProduct = Omit<Product, "sv" | "en"> & ProductText;

export function localProduct(p: Product, lang: Lang): LocalProduct {
  const { sv: _sv, en: _en, ...rest } = p;
  return { ...rest, ...productText(p, lang) };
}
