"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitInquiry, type InquiryState } from "@/app/actions/public";
import { moveFilesToBlob } from "@/lib/upload-client";
import type { BlobMode } from "@/lib/upload-rules";
import { MAX_INQUIRY_FILES, UploadError } from "@/lib/upload-rules";
import { t } from "@/lib/i18n";
import Select from "@/components/ui/Select";
import FilePicker, { FileTiles, usePreviews } from "./FilePicker";
import type { Lang } from "@/lib/types";

type Option = { slug: string; name: string; colors: string[]; image?: string; category?: string };

export default function OrderForm({
  lang,
  products,
  initialSlug = "",
  direct = null,
}: {
  lang: Lang;
  direct?: BlobMode;
  products: Option[];
  initialSlug?: string;
}) {
  const d = t(lang).order;
  // the selected files live in state, so they survive a failed send instead of being cleared with the form
  const [files, setFiles] = useState<File[]>([]);
  const filesRef = useRef<File[]>([]);
  filesRef.current = files;
  const previews = usePreviews(files);
  const [state, action, pending] = useActionState<InquiryState, FormData>(async (prev, form) => {
    form.delete("files");
    for (const file of filesRef.current) form.append("files", file);
    if (direct) {
      try {
        await moveFilesToBlob(form, "files", "inquiries", direct, MAX_INQUIRY_FILES);
      } catch (e) {
        console.error("[order] file upload failed", e);
        const err = e as UploadError;
        const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
        const error = err.kind === "type" ? d.errFileType(err.detail) : err.kind === "size" ? d.errFileSize(err.detail, err.mb) : d.errUpload(err.detail);
        return { ok: false, error, fields };
      }
    }
    return submitInquiry(prev, form);
  }, { ok: false });
  const [slug, setSlug] = useState(initialSlug);
  const selected = products.find((p) => p.slug === slug);
  const f = state.fields ?? {};
  const done = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.ok) done.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state.ok]);

  if (state.ok) {
    return (
      <div ref={done} className="rounded-[22px] bg-paper p-8 ring-1 ring-mist" role="status">
        <h2 className="text-2xl font-semibold">{d.thanksTitle}</h2>
        <p className="mt-3 max-w-prose text-fjord">{d.thanksText}</p>
        {files.length > 0 && (
          <div className="mt-6">
            <p className="label">{d.attached(files.length)}</p>
            <FileTiles files={files} previews={previews} />
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5 rounded-[22px] bg-paper p-6 ring-1 ring-mist sm:p-8" noValidate>
      <input type="hidden" name="lang" value={lang} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">{d.name}</label>
          <input className="field" id="name" name="name" autoComplete="name" required defaultValue={f.name} />
        </div>
        <div>
          <label className="label" htmlFor="email">{d.email}</label>
          <input className="field" id="email" name="email" type="email" autoComplete="email" required defaultValue={f.email} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <div>
          <label className="label" htmlFor="productSlug">{d.about}</label>
          <Select
            id="productSlug"
            name="productSlug"
            value={slug}
            onChange={setSlug}
            options={[
              {
                value: "",
                label: d.customIdea,
                hint: d.customIdeaHint,
                icon: (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
                  </svg>
                ),
              },
              ...products.map((p) => ({ value: p.slug, label: p.name, hint: p.category, image: p.image, swatches: p.colors })),
            ]}
          />
        </div>
        <div>
          <label className="label" htmlFor="quantity">{d.quantity}</label>
          <input className="field" id="quantity" name="quantity" inputMode="numeric" defaultValue={f.quantity ?? "1"} />
        </div>
      </div>
      {selected && selected.colors.length > 0 && (
        <fieldset>
          <legend className="label">{d.color}</legend>
          <div className="flex flex-wrap gap-2">
            {selected.colors.map((c, i) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="color" value={c} defaultChecked={i === 0} className="peer sr-only" />
                <span
                  className="block h-9 w-9 rounded-full ring-1 ring-black/10 peer-checked:ring-[3px] peer-checked:ring-granite peer-focus-visible:outline-2 peer-focus-visible:outline-hallon"
                  style={{ background: c }}
                  title={c}
                />
                <span className="sr-only">{c}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div>
        <label className="label" htmlFor="message">{d.message}</label>
        <textarea
          className="field min-h-36"
          id="message"
          name="message"
          required
          defaultValue={f.message}
          placeholder={selected ? d.placeholderProduct : d.placeholderCustom}
        />
      </div>
      <div>
        <label className="label" htmlFor="phone">{d.phone} <span className="font-normal text-fjord">{d.optional}</span></label>
        <input className="field" id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={f.phone} />
      </div>
      <div>
        <span className="label">{d.files} <span className="font-normal text-fjord">{d.optional}</span></span>
        <FilePicker lang={lang} files={files} onChange={setFiles} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state.error && (
        <p className="rounded-xl bg-hallon-soft px-4 py-3 font-medium text-hallon-dark" role="alert">{state.error}</p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn btn-primary" disabled={pending}>{pending ? d.sending : d.send}</button>
        <p className="hint">{d.noCommitment}</p>
      </div>
    </form>
  );
}
