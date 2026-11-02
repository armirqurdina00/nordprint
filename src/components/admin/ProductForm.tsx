"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Lang, Product, ProductText } from "@/lib/types";
import { saveProduct, type FormState } from "@/app/admin/actions";
import { moveFilesToBlob } from "@/lib/upload-client";
import { FormFeedback, ImageManager, SubmitButton } from "./ui";
import LangTabs from "./LangTabs";
import { slugify } from "@/lib/format";

const EMPTY: ProductText = { name: "", tagline: "", description: "", priceNote: "", category: "", material: "", dimensions: "", leadTime: "" };

export default function ProductForm({ product, categories, direct = false }: { product?: Product; categories: Record<Lang, string[]>; direct?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(async (prev, form) => {
    if (direct) {
      try {
        await moveFilesToBlob(form, "newImages", "products");
      } catch (e) {
        return { error: (e as Error).message };
      }
    }
    return saveProduct(prev, form);
  }, {});
  const [svName, setSvName] = useState(product?.sv.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [colors, setColors] = useState((product?.colors ?? []).join(", "));
  const parsedColors = colors.split(/[\s,]+/).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const text = (l: Lang) => product?.[l] ?? EMPTY;

  return (
    <form action={action} className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <div className="space-y-6">
        <section className="rounded-2xl bg-paper p-6 ring-1 ring-mist">
          <LangTabs missing={{ en: !!product && !product.en.name }}>
            {(l) => (
              <>
                <div>
                  <label className="label" htmlFor={`${l}_name`}>Namn</label>
                  {l === "sv" ? (
                    <input className="field" id="sv_name" name="sv_name" required value={svName} onChange={(e) => setSvName(e.target.value)} />
                  ) : (
                    <input className="field" id="en_name" name="en_name" defaultValue={text(l).name} placeholder={svName} />
                  )}
                </div>
                <div>
                  <label className="label" htmlFor={`${l}_tagline`}>Kort beskrivning</label>
                  <input className="field" id={`${l}_tagline`} name={`${l}_tagline`} defaultValue={text(l).tagline} maxLength={120} />
                  <p className="hint mt-1">En mening som visas under namnet i produktlistan.</p>
                </div>
                <div>
                  <label className="label" htmlFor={`${l}_description`}>Beskrivning</label>
                  <textarea className="field min-h-40" id={`${l}_description`} name={`${l}_description`} defaultValue={text(l).description} />
                  <p className="hint mt-1">Lämna en tom rad mellan stycken.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor={`${l}_category`}>Kategori</label>
                    <input className="field" id={`${l}_category`} name={`${l}_category`} defaultValue={text(l).category} list={`${l}_categories`} />
                    <datalist id={`${l}_categories`}>{categories[l].map((c) => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div>
                    <label className="label" htmlFor={`${l}_priceNote`}>Pristillägg</label>
                    <input className="field" id={`${l}_priceNote`} name={`${l}_priceNote`} defaultValue={text(l).priceNote} placeholder={l === "sv" ? "för 4 st" : "for 4"} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`${l}_material`}>Material</label>
                    <input className="field" id={`${l}_material`} name={`${l}_material`} defaultValue={text(l).material} list="materials" />
                  </div>
                  <div>
                    <label className="label" htmlFor={`${l}_dimensions`}>Mått</label>
                    <input className="field" id={`${l}_dimensions`} name={`${l}_dimensions`} defaultValue={text(l).dimensions} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor={`${l}_leadTime`}>Leveranstid</label>
                    <input className="field" id={`${l}_leadTime`} name={`${l}_leadTime`} defaultValue={text(l).leadTime} placeholder={l === "sv" ? "2–4 arbetsdagar" : "2–4 working days"} />
                  </div>
                </div>
              </>
            )}
          </LangTabs>
          <datalist id="materials"><option value="PLA" /><option value="PETG" /><option value="TPU" /><option value="ABS" /></datalist>
        </section>
        <section className="rounded-2xl bg-paper p-6 ring-1 ring-mist">
          <h2 className="label text-base">Bilder</h2>
          <ImageManager initial={product?.images ?? []} />
        </section>
      </div>

      <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
        <section className="space-y-4 rounded-2xl bg-paper p-6 ring-1 ring-mist">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-semibold">Publicerad</span>
              <span className="hint">Synlig på webbplatsen</span>
            </span>
            <input type="checkbox" name="published" defaultChecked={product?.published ?? true} className="h-5 w-5 accent-hallon" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-semibold">Visa på startsidan</span>
              <span className="hint">De fem första utvalda visas</span>
            </span>
            <input type="checkbox" name="featured" defaultChecked={product?.featured} className="h-5 w-5 accent-hallon" />
          </label>
        </section>
        <section className="space-y-4 rounded-2xl bg-paper p-6 ring-1 ring-mist">
          <div>
            <label className="label" htmlFor="price">Pris (kr)</label>
            <input className="field" id="price" name="price" inputMode="decimal" defaultValue={product?.price ?? ""} placeholder="Pris på förfrågan" />
            <p className="hint mt-1">Lämna tomt för att visa &quot;Pris på förfrågan&quot;.</p>
          </div>
          <div>
            <label className="label" htmlFor="slug">Adress</label>
            <input className="field" id="slug" name="slug" value={slug} placeholder={slugify(svName)} onChange={(e) => setSlug(e.target.value)} />
            <p className="hint mt-1">/produkter/{slug || slugify(svName) || "…"} och /en/products/{slug || slugify(svName) || "…"}</p>
          </div>
          <div>
            <label className="label" htmlFor="colors">Färger</label>
            <input className="field font-mono text-sm" id="colors" name="colors" value={colors} onChange={(e) => setColors(e.target.value)} placeholder="#d8285a, #f4c542" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {parsedColors.map((c) => <span key={c} className="h-7 w-7 rounded-full ring-1 ring-black/10" style={{ background: c }} />)}
              <label className="relative grid h-7 w-7 cursor-pointer place-items-center rounded-full text-lg ring-1 ring-mist hover:ring-granite" title="Lägg till färg">
                +
                <input type="color" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => setColors((c) => (c.trim() ? `${c}, ${e.target.value}` : e.target.value))} />
              </label>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="instagram">Instagram-inlägg <span className="font-normal text-fjord">(valfritt)</span></label>
            <input className="field" id="instagram" name="instagram" type="url" defaultValue={product?.instagram} placeholder="https://www.instagram.com/p/…" />
          </div>
        </section>
        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton>{product ? "Spara ändringar" : "Skapa produkt"}</SubmitButton>
          {product?.published && <Link href={`/produkter/${product.slug}`} target="_blank" className="font-medium underline underline-offset-4">Visa på webbplatsen</Link>}
        </div>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
