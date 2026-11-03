"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  image?: string;
  /** small colour dots shown after the label (e.g. product colours); "*" is the any-colour swatch */
  swatches?: string[];
  /** a single status dot shown before the label */
  dot?: string;
  icon?: React.ReactNode;
};

/** Leading visual of an option: photo, icon or dot. */
function Leading({ o, size = "md" }: { o: SelectOption; size?: "sm" | "md" }) {
  // "sm" is used inside the closed select and must not be taller than one line of text (1.6rem),
  // so the select keeps exactly the same height as a normal input
  const box = size === "md" ? "h-10 w-10 rounded-xl [&>svg]:h-5 [&>svg]:w-5" : "-my-0.5 h-6 w-6 rounded-md [&>svg]:h-4 [&>svg]:w-4";
  if (o.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={o.image} alt="" className={`${box} shrink-0 object-cover ring-1 ring-black/5`} />;
  }
  if (o.icon) return <span className={`${box} grid shrink-0 place-items-center bg-snow text-fjord ring-1 ring-mist`}>{o.icon}</span>;
  if (o.dot) return <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.dot }} />;
  return null;
}

/**
 * Accessible custom select (WAI-ARIA combobox + listbox pattern).
 * Submits through a hidden input, so it works in plain <form action> forms.
 */
export default function Select({
  id,
  name,
  options,
  value: controlled,
  defaultValue,
  onChange,
  placeholder = "",
  className = "",
}: {
  id?: string;
  name: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const listId = `${baseId}-list`;
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? options[0]?.value ?? "");
  const value = controlled ?? uncontrolled;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<"down" | "up">("down");
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options.find((o) => o.value === value);

  const choose = (i: number) => {
    const o = options[i];
    if (!o) return;
    if (controlled === undefined) setUncontrolled(o.value);
    onChange?.(o.value);
    setOpen(false);
    button.current?.focus();
  };

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  // decide whether the list fits below the button, otherwise open upwards
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const r = button.current.getBoundingClientRect();
    const needed = Math.min(320, options.length * 56 + 16);
    setPlacement(window.innerHeight - r.bottom < needed && r.top > window.innerHeight - r.bottom ? "up" : "down");
  }, [open, options.length]);

  // keep the active option scrolled into view
  useEffect(() => {
    if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(last, a + 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        return;
      case "Home":
        e.preventDefault();
        setActive(0);
        return;
      case "End":
        e.preventDefault();
        setActive(last);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        return;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        return;
      case "Tab":
        setOpen(false);
        return;
    }
    // type to jump to an option
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at > 700 ? "" : typed.current.text) + e.key.toLowerCase(), at: now };
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} />
      <button
        ref={button}
        id={baseId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${baseId}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`field flex items-center gap-2.5 text-left ${open ? "border-hallon shadow-[0_0_0_3px_var(--color-hallon-soft)]" : ""}`}
      >
        {selected ? (
          <>
            <Leading o={selected} size="sm" />
            <span className="min-w-0 flex-1 truncate">{selected.label}</span>
          </>
        ) : (
          <span className="flex-1 text-fjord">{placeholder}</span>
        )}
        <svg aria-hidden viewBox="0 0 20 20" className={`h-5 w-5 shrink-0 text-fjord transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ul
        ref={list}
        id={listId}
        role="listbox"
        aria-labelledby={baseId}
        tabIndex={-1}
        className={`absolute inset-x-0 z-30 max-h-80 overflow-y-auto overscroll-contain rounded-2xl bg-paper p-1.5 shadow-[0_18px_50px_-12px_rgba(30,43,48,0.35)] ring-1 ring-mist transition-[opacity,transform] duration-150 ease-out ${
          placement === "down" ? "top-full mt-2 origin-top" : "bottom-full mb-2 origin-bottom"
        } ${open ? "visible scale-100 opacity-100" : "invisible scale-[0.97] opacity-0"}`}
      >
        {options.map((o, i) => {
          const isSelected = o.value === value;
          return (
            <li
              key={o.value || "__empty"}
              id={`${baseId}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={isSelected}
              onPointerMove={() => setActive(i)}
              onClick={() => choose(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${i === active ? "bg-snow" : ""}`}
            >
              <Leading o={o} />
              <span className="min-w-0 flex-1">
                <span className={`block truncate ${isSelected ? "font-semibold" : "font-medium"}`}>{o.label}</span>
                {(o.hint || o.swatches?.length) && (
                  <span className="mt-0.5 flex items-center gap-2 text-sm text-fjord">
                    {o.hint && <span className="truncate">{o.hint}</span>}
                    {o.swatches && o.swatches.length > 0 && (
                      <span className="flex gap-1" aria-hidden>
                        {o.swatches.slice(0, 6).map((c) => (
                          <span key={c} className={`h-2.5 w-2.5 rounded-full ring-1 ring-black/10 ${c === "*" ? "swatch-all" : ""}`} style={c === "*" ? undefined : { background: c }} />
                        ))}
                      </span>
                    )}
                  </span>
                )}
              </span>
              <svg aria-hidden viewBox="0 0 20 20" className={`h-5 w-5 shrink-0 text-hallon ${isSelected ? "opacity-100" : "opacity-0"}`}>
                <path d="m5 10.5 3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
