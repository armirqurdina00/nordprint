"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { checkFile, extOf, MAX_INQUIRY_FILES, UploadError } from "@/lib/upload-rules";

const IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Object URLs for image previews, revoked when the files change or the component unmounts. */
export function usePreviews(files: File[]) {
  const urls = useMemo(() => files.map((f) => (IMAGE.test(f.name) ? URL.createObjectURL(f) : "")), [files]);
  useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls]);
  return urls;
}

export function FileTiles({ files, previews, onRemove, removeLabel }: { files: File[]; previews: string[]; onRemove?: (i: number) => void; removeLabel?: (name: string) => string }) {
  if (files.length === 0) return null;
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {files.map((f, i) => (
        <li key={`${f.name}-${f.size}-${i}`} className="group relative">
          <div className="aspect-square overflow-hidden rounded-xl bg-snow ring-1 ring-mist">
            {previews[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
                <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7 text-fjord" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                  <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" />
                  <path d="M4 7.5 12 12l8-4.5M12 12v9" />
                </svg>
                <span className="font-display text-xs font-semibold uppercase">{extOf(f.name).slice(1)}</span>
              </div>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-fjord" title={f.name}>
            {f.name}
            <span className="block">{formatSize(f.size)}</span>
          </p>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={removeLabel?.(f.name)}
              className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-granite text-snow shadow-md ring-2 ring-paper transition-transform hover:scale-110"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * File picker that keeps its own list of files (so nothing is lost if sending fails),
 * checks type and size immediately, and shows previews.
 */
export default function FilePicker({ lang, files, onChange }: { lang: Lang; files: File[]; onChange: (files: File[]) => void }) {
  const d = t(lang).order;
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const previews = usePreviews(files);

  const add = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    let problem = "";
    for (const f of Array.from(list)) {
      try {
        checkFile(f, "inquiries");
      } catch (e) {
        const err = e as UploadError;
        problem = err.kind === "type" ? d.errFileType(err.detail) : d.errFileSize(err.detail, err.mb);
        continue;
      }
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      if (next.length >= MAX_INQUIRY_FILES) {
        problem = d.errMaxFiles(MAX_INQUIRY_FILES);
        break;
      }
      next.push(f);
    }
    setError(problem);
    onChange(next);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed px-4 py-6 text-center transition-colors focus-within:border-hallon hover:border-hallon ${
          dragging ? "border-hallon bg-hallon-soft" : "border-mist"
        }`}
      >
        <span className="font-medium">{files.length ? d.addMoreFiles : d.chooseFiles}</span>
        <span className="hint">{d.filesHint}</span>
        <input
          ref={input}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.stl,.3mf,.obj,.step,.stp,.pdf"
          className="sr-only"
          onChange={(e) => add(e.target.files)}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-hallon-dark">
          {error}
        </p>
      )}
      <FileTiles
        files={files}
        previews={previews}
        removeLabel={d.removeFile}
        onRemove={(i) => {
          setError("");
          onChange(files.filter((_, k) => k !== i));
        }}
      />
    </div>
  );
}
