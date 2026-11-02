"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Text input with a styled suggestion list (replaces <datalist>).
 * Any text is allowed; suggestions only help to reuse existing values.
 */
export default function Combobox({
  id,
  name,
  defaultValue = "",
  suggestions,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  suggestions: string[];
  placeholder?: string;
}) {
  const listId = `${useId()}-list`;
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);

  const q = value.trim().toLowerCase();
  const exact = suggestions.some((s) => s.toLowerCase() === q);
  // while the field holds an existing value, show every option so it's easy to switch
  const matches = [...new Set(suggestions)].filter((s) => !q || exact || s.toLowerCase().includes(q));
  const show = open && matches.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const pick = (s: string) => {
    setValue(s);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(matches.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && show && active >= 0) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative">
      <input
        id={id}
        name={name}
        className="field pr-10"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {suggestions.length > 0 && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-fjord"
        >
          <svg viewBox="0 0 20 20" className={`h-5 w-5 transition-transform duration-200 ${show ? "rotate-180" : ""}`}>
            <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <ul
        id={listId}
        role="listbox"
        className={`absolute inset-x-0 top-full z-30 mt-2 max-h-60 origin-top overflow-y-auto rounded-2xl bg-paper p-1.5 shadow-[0_18px_50px_-12px_rgba(30,43,48,0.35)] ring-1 ring-mist transition-[opacity,transform] duration-150 ease-out ${
          show ? "visible scale-100 opacity-100" : "invisible scale-[0.97] opacity-0"
        }`}
      >
        {matches.map((s, i) => (
          <li
            key={s}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={s === value}
            onMouseDown={(e) => e.preventDefault()}
            onPointerMove={() => setActive(i)}
            onClick={() => pick(s)}
            className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 font-medium ${i === active ? "bg-snow" : ""}`}
          >
            {s}
            {s === value && (
              <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5 text-hallon">
                <path d="m5 10.5 3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
