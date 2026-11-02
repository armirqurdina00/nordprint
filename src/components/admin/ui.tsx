"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText = "Sparar…", className = "btn btn-primary" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Shows "Sparat" briefly after a successful save, or the error message. */
export function FormFeedback({ state }: { state: { error?: string; saved?: number } }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!state.saved) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(t);
  }, [state.saved]);
  if (state.error) return <p role="alert" className="font-medium text-hallon-dark">{state.error}</p>;
  return <p role="status" className={`font-medium text-emerald-700 transition-opacity ${show ? "opacity-100" : "opacity-0"}`}>Sparat</p>;
}

/** Two-step destructive button: first click arms it, second click submits. */
export function ConfirmButton({ children, confirmText }: { children: React.ReactNode; confirmText: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type={armed ? "submit" : "button"}
      onClick={() => !armed && setArmed(true)}
      className={`btn ${armed ? "bg-hallon-dark text-white" : "text-hallon-dark ring-[1.5px] ring-inset ring-hallon-soft hover:bg-hallon-soft"}`}
    >
      {armed ? confirmText : children}
    </button>
  );
}

type Field = { key: string; label: string; multiline?: boolean };

/** Editable list of objects, serialised as JSON into a hidden input named `name`. */
export function ListEditor<T extends Record<string, string>>({
  name,
  initial,
  fields,
  addLabel,
}: {
  name: string;
  initial: T[];
  fields: Field[];
  addLabel: string;
}) {
  const [items, setItems] = useState<T[]>(initial);
  const update = (i: number, key: string, value: string) =>
    setItems((list) => list.map((it, k) => (k === i ? { ...it, [key]: value } : it)));
  const move = (i: number, d: number) =>
    setItems((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.map((item, i) => (
        <div key={i} className="rounded-2xl bg-snow p-4">
          <div className="grid gap-3">
            {fields.map((f) => (
              <label key={f.key} className="block">
                <span className="label">{f.label}</span>
                {f.multiline ? (
                  <textarea className="field min-h-20" value={item[f.key] ?? ""} onChange={(e) => update(i, f.key, e.target.value)} />
                ) : (
                  <input className="field" value={item[f.key] ?? ""} onChange={(e) => update(i, f.key, e.target.value)} />
                )}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2 text-sm">
            <button type="button" className="rounded-full px-3 py-1.5 ring-1 ring-mist hover:ring-granite disabled:opacity-40" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Flytta upp">Upp</button>
            <button type="button" className="rounded-full px-3 py-1.5 ring-1 ring-mist hover:ring-granite disabled:opacity-40" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Flytta ner">Ner</button>
            <button type="button" className="ml-auto rounded-full px-3 py-1.5 text-hallon-dark hover:bg-hallon-soft" onClick={() => setItems((l) => l.filter((_, k) => k !== i))}>Ta bort</button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded-2xl border-[1.5px] border-dashed border-mist py-3 font-medium hover:border-granite"
        onClick={() => setItems((l) => [...l, Object.fromEntries(fields.map((f) => [f.key, ""])) as T])}
      >
        {addLabel}
      </button>
    </div>
  );
}

/** Existing images with reorder/remove, plus a file picker with previews for new images. */
export function ImageManager({ initial }: { initial: string[] }) {
  const [images, setImages] = useState(initial);
  const [removed, setRemoved] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const key = initial.join("|");

  // after a save the server sends the new image list: reset local state to it
  useEffect(() => {
    setImages(key ? key.split("|") : []);
    setRemoved([]);
    setPreviews([]);
    if (fileInput.current) fileInput.current.value = "";
  }, [key]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="removedImages" value={JSON.stringify(removed)} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((src, i) => (
          <div key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-snow ring-1 ring-mist">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-granite px-2 py-0.5 text-xs text-white">Huvudbild</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 p-2 text-xs text-white">
              <button type="button" disabled={i === 0} className="disabled:opacity-30" onClick={() => setImages((l) => [l[i], ...l.filter((_, k) => k !== i)])}>
                Gör till huvudbild
              </button>
              <button type="button" onClick={() => { setImages((l) => l.filter((x) => x !== src)); setRemoved((r) => [...r, src]); }}>
                Ta bort
              </button>
            </div>
          </div>
        ))}
        {previews.map((src) => (
          <div key={src} className="relative aspect-square overflow-hidden rounded-xl ring-2 ring-hallon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover opacity-80" />
            <span className="absolute left-2 top-2 rounded-full bg-hallon px-2 py-0.5 text-xs text-white">Ny</span>
          </div>
        ))}
      </div>
      <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-dashed border-mist py-5 font-medium hover:border-granite">
        Lägg till bilder
        <input
          type="file"
          ref={fileInput}
          name="newImages"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))}
        />
      </label>
      <p className="hint mt-1">JPG, PNG eller WebP, högst 10 MB per bild. Bilderna sparas när du sparar produkten.</p>
    </div>
  );
}
