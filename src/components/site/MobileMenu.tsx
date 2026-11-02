"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "@/lib/types";
import LangSwitch from "./LangSwitch";

type Item = { href: string; label: string };

export default function MobileMenu({
  lang,
  items,
  order,
  switchText,
  switchLabel,
  instagram,
  openLabel,
  closeLabel,
  navLabel,
}: {
  lang: Lang;
  items: Item[];
  order: Item;
  switchText: string;
  switchLabel: string;
  instagram: string;
  openLabel: string;
  closeLabel: string;
  navLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [top, setTop] = useState(64);
  const button = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();
  const id = useId();

  useEffect(() => setMounted(true), []);

  // close when the page changes
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    // the panel starts right below the header (which may include the announcement bar)
    setTop(button.current?.closest("header")?.getBoundingClientRect().bottom ?? 64);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);
  const reveal = (i: number) => ({
    transitionDelay: open ? `${80 + i * 45}ms` : "0ms",
  });
  const revealClass = `transition-[opacity,translate] duration-500 ease-[cubic-bezier(.2,.7,.2,1)] ${
    open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
  }`;

  const panel = (
    <div
      id={id}
      inert={!open}
      aria-hidden={!open}
      className={`print-layers fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-y-auto bg-snow px-5 pb-8 transition-[opacity,clip-path] duration-500 ease-[cubic-bezier(.2,.7,.2,1)] md:hidden ${
        open ? "visible opacity-100 [clip-path:inset(0_0_0_0)]" : "invisible opacity-0 [clip-path:inset(0_0_100%_0)]"
      }`}
      style={{ top }}
    >
      <nav aria-label={navLabel} className="pt-8">
        <ul className="divide-y divide-mist border-y border-mist">
          {items.map((item, i) => (
            <li key={item.href} className={revealClass} style={reveal(i)}>
              <Link
                ref={i === 0 ? firstLink : undefined}
                href={item.href}
                onClick={close}
                className="group flex items-center justify-between py-5 font-display text-[2rem] font-semibold leading-none tracking-tight active:text-hallon"
              >
                {item.label}
                <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 text-fjord transition-transform group-hover:translate-x-1 group-active:translate-x-1">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className={`mt-auto space-y-5 pt-10 ${revealClass}`} style={reveal(items.length)}>
        <Link href={order.href} onClick={close} className="btn btn-primary w-full py-4 text-lg">
          {order.label}
        </Link>
        <div className="flex items-center justify-between gap-4 text-[0.95rem] font-medium">
          <LangSwitch lang={lang} label={switchLabel} text={switchText} className="rounded-full px-4 py-2 ring-1 ring-mist hover:ring-granite" />
          {instagram && (
            <a href={instagram} target="_blank" rel="noopener" className="flex items-center gap-2 text-fjord hover:text-granite">
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              @nordprint.3s
            </a>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-11 w-11 place-items-center rounded-full ring-1 ring-granite/80 transition-colors hover:bg-granite hover:text-snow md:hidden"
      >
        <span aria-hidden className="relative block h-3.5 w-5">
          <span
            className={`absolute left-0 h-[2px] w-5 rounded-full bg-current transition-all duration-300 ${
              open ? "top-[6px] rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 h-[2px] rounded-full bg-current transition-all duration-300 ${
              open ? "top-[6px] w-5 -rotate-45" : "top-[12px] w-3.5"
            }`}
          />
        </span>
      </button>
      {mounted && createPortal(panel, document.body)}
    </>
  );
}
