"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminT } from "./AdminI18n";

const icon = (d: React.ReactNode) => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const ICONS = {
  overview: icon(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>),
  products: icon(<><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></>),
  inquiries: icon(<><path d="M4 13.5 6.5 5h11l2.5 8.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" /></>),
  content: icon(<><path d="M6 3.5h8.5L19 8v12.5H6z" /><path d="M14 3.5V8h5M9 12.5h7M9 16h5" /></>),
};

export default function AdminNav({ newCount, onNavigate }: { newCount: number; onNavigate?: () => void }) {
  const path = usePathname();
  const { t } = useAdminT();
  const items = [
    { href: "/admin", label: t.nav.overview, exact: true, icon: ICONS.overview },
    { href: "/admin/produkter", label: t.nav.products, icon: ICONS.products },
    { href: "/admin/forfragningar", label: t.nav.inquiries, badge: newCount, icon: ICONS.inquiries },
    { href: "/admin/innehall", label: t.nav.content, icon: ICONS.content },
  ];
  return (
    <nav className="flex flex-col gap-1" aria-label={t.nav.menu}>
      {items.map((it) => {
        const active = it.exact ? path === it.href : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-colors ${
              active ? "bg-white/12 text-white" : "text-mist hover:bg-white/6 hover:text-white"
            }`}
          >
            {it.icon}
            <span className="flex-1">{it.label}</span>
            {it.badge ? (
              <span className="rounded-full bg-hallon px-2 text-sm tabular-nums text-white" aria-label={t.nav.newBadge(it.badge)}>
                {it.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
