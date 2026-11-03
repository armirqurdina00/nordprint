"use client";

import { useEffect, useRef, useState } from "react";
import { usePreviews } from "@/components/site/FilePicker";
import { checkFile, extOf, MAX_CHAT_FILES, MAX_CHAT_TEXT, UploadError } from "@/lib/upload-rules";

export type ComposerLabels = {
  placeholder: string;
  send: string;
  attach: string;
  removeFile: (name: string) => string;
  maxFiles: (n: number) => string;
  empty: string;
};

const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.avif,.stl,.3mf,.obj,.step,.stp,.pdf";

/**
 * Message box: grows with the text, Enter sends (Shift + Enter for a new line; on touch screens
 * the Enter key adds a line and the button sends), and files can be attached, pasted or dropped.
 */
export default function ChatComposer({
  labels,
  fileError,
  onSend,
  error,
  hint,
  autoFocus = false,
  id,
}: {
  labels: ComposerLabels;
  fileError: (e: UploadError) => string;
  onSend: (text: string, files: File[]) => void;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
  id?: string;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState("");
  const [dragging, setDragging] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const previews = usePreviews(files);

  const resize = () => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };
  useEffect(resize, [text]);

  useEffect(() => {
    if (autoFocus && !window.matchMedia("(pointer: coarse)").matches) area.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const add = (list: FileList | File[] | null) => {
    if (!list) return;
    const next = [...files];
    let msg = "";
    for (const f of Array.from(list)) {
      try {
        checkFile(f, "chat");
      } catch (e) {
        msg = fileError(e as UploadError);
        continue;
      }
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      if (next.length >= MAX_CHAT_FILES) {
        msg = labels.maxFiles(MAX_CHAT_FILES);
        break;
      }
      next.push(f);
    }
    setProblem(msg);
    setFiles(next);
    if (picker.current) picker.current.value = "";
  };

  const send = () => {
    const body = text.trim();
    if (!body && files.length === 0) {
      setProblem(labels.empty);
      area.current?.focus();
      return;
    }
    onSend(body, files);
    setText("");
    setFiles([]);
    setProblem("");
    area.current?.focus();
  };

  const shown = problem || error;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        add(e.dataTransfer.files);
      }}
      className={`transition-colors ${dragging ? "bg-hallon-soft" : ""}`}
    >
      {files.length > 0 && (
        <ul className="mb-2 flex gap-2 overflow-x-auto pb-1 pt-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}`} className="relative shrink-0">
              {previews[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[i]} alt={f.name} className="h-16 w-16 rounded-xl object-cover ring-1 ring-mist" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-xl bg-snow text-center text-xs font-semibold ring-1 ring-mist" title={f.name}>
                  {extOf(f.name).slice(1).toUpperCase()}
                </span>
              )}
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, k) => k !== i))}
                aria-label={labels.removeFile(f.name)}
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-granite text-snow ring-2 ring-paper"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => picker.current?.click()}
          aria-label={labels.attach}
          title={labels.attach}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fjord transition-colors hover:bg-snow hover:text-granite"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m20.5 11.5-8.1 8.1a5.25 5.25 0 0 1-7.4-7.4l8.4-8.4a3.5 3.5 0 0 1 5 5l-8.4 8.4a1.75 1.75 0 0 1-2.5-2.5l7.8-7.8" />
          </svg>
        </button>
        <input ref={picker} type="file" multiple accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => add(e.target.files)} />
        <label htmlFor={id} className="sr-only">
          {labels.placeholder}
        </label>
        <textarea
          ref={area}
          id={id}
          rows={1}
          value={text}
          maxLength={MAX_CHAT_TEXT}
          placeholder={labels.placeholder}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              add(e.clipboardData.files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) {
              e.preventDefault();
              send();
            }
          }}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-[22px] border-[1.5px] border-mist bg-paper px-4 py-[0.55rem] leading-relaxed transition-colors placeholder:text-fjord/80 focus:border-hallon focus:shadow-[0_0_0_3px_var(--color-hallon-soft)] focus:outline-none"
        />
        <button
          type="submit"
          aria-label={labels.send}
          title={labels.send}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-hallon text-white transition-colors hover:bg-hallon-dark disabled:opacity-50"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 translate-x-px" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {shown && (
        <p role="alert" className="mt-2 px-1 text-sm font-medium text-hallon-dark">
          {shown}
        </p>
      )}
      {hint && !shown && <p className="mt-2 hidden px-1 text-xs text-fjord sm:block">{hint}</p>}
    </form>
  );
}
