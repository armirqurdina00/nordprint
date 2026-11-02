"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ newCount }: { newCount: number }) {
  const path = usePathname();
  const items = [
    { href: "/admin", label: "Översikt", exact: true },
    { href: "/admin/produkter", label: "Produkter" },
    { href: "/admin/forfragningar", label: "Förfrågningar", badge: newCount },
    { href: "/admin/innehall", label: "Sidinnehåll" },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Admin">
      {items.map((it) => {
        const active = it.exact ? path === it.href : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 font-medium ${active ? "bg-white/12 text-white" : "text-mist hover:bg-white/6 hover:text-white"}`}
          >
            {it.label}
            {it.badge ? <span className="rounded-full bg-hallon px-2 text-sm tabular-nums text-white">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
