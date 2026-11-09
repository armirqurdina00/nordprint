"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/admin/actions";
import Logo from "@/components/site/Logo";
import AdminNav from "./AdminNav";
import { AdminLangSwitch, useAdminT } from "./AdminI18n";
import { useChatLive } from "./ChatLive";
import { useInquiryLive } from "./InquiryLive";
import { usePush } from "@/lib/push-client";

/** Admin sidebar: fixed on desktop, a slide-in drawer behind a top bar on small screens. */
export default function AdminChrome({ logo, pushKey }: { logo: string; pushKey: string }) {
  const [open, setOpen] = useState(false);
  const push = usePush({ url: "/api/admin/push", publicKey: pushKey, flag: "np_push_admin" });
  const { t } = useAdminT();
  const { unread } = useChatLive();
  const { newCount } = useInquiryLive();
  const pathname = usePathname();
  const burger = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burger.current?.focus();
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

  const logoEl = <Logo src={logo} className={logo ? "rounded bg-white p-1" : ""} />;

  const footer = (
    <div className="mt-auto space-y-1 border-t border-white/10 pt-4 text-[0.95rem]">
      <div className="px-3.5 pb-2">
        <AdminLangSwitch />
      </div>
      <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-mist hover:bg-white/6 hover:text-white">
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
        {t.nav.viewSite}
      </Link>
      {(push.state === "on" || push.state === "off") && (
        <button
          type="button"
          role="switch"
          aria-checked={push.state === "on"}
          disabled={push.busy}
          onClick={push.state === "on" ? push.disable : push.enable}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-mist hover:bg-white/6 hover:text-white disabled:opacity-60"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 21h4" />
          </svg>
          <span className="flex-1">{t.nav.notifications}</span>
          <span className="text-sm font-semibold">{push.state === "on" ? t.nav.notificationsOn : t.nav.notificationsOff}</span>
        </button>
      )}
      {push.failed && <p role="alert" className="px-3.5 text-sm text-mist">{t.nav.notificationsFailed}</p>}
      {push.state === "install" && <p className="px-3.5 py-2 text-sm text-mist">{t.nav.notificationsInstall}</p>}
      {push.state === "denied" && <p className="px-3.5 py-2 text-sm text-mist">{t.nav.notificationsBlocked}</p>}
      {/* a logged-out device must stop receiving customers' messages */}
      <form action={logout} onSubmit={() => void (push.state === "on" && push.disable())}>
        <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-mist hover:bg-white/6 hover:text-white">
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4" />
          </svg>
          {t.nav.logout}
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* small screens: top bar */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-granite px-4 text-snow md:hidden">
        <Link href="/admin" aria-label={t.nav.toOverview} className="flex items-center">
          {logoEl}
        </Link>
        <button
          ref={burger}
          type="button"
          aria-expanded={open}
          aria-controls="admin-drawer"
          aria-label={t.nav.openMenu}
          onClick={() => setOpen(true)}
          className="relative grid h-11 w-11 place-items-center rounded-full ring-1 ring-white/25 hover:bg-white/10"
        >
          <span aria-hidden className="flex w-5 flex-col gap-[5px]">
            <span className="h-[2px] w-5 rounded-full bg-current" />
            <span className="h-[2px] w-3.5 rounded-full bg-current" />
          </span>
          {newCount + unread > 0 && (
            <span
              className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-hallon ring-2 ring-granite"
              aria-label={[newCount && t.nav.newInquiries(newCount), unread && t.nav.unreadChats(unread)].filter(Boolean).join(", ")}
            />
          )}
        </button>
      </div>

      {/* small screens: backdrop + drawer */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-granite/45 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        id="admin-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.menu}
        inert={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-granite p-5 text-snow transition-[translate,box-shadow] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] md:hidden ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full shadow-none"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          {logoEl}
          <button
            ref={closeBtn}
            type="button"
            aria-label={t.nav.closeMenu}
            onClick={() => {
              setOpen(false);
              burger.current?.focus();
            }}
            className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-white/25 hover:bg-white/10"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <AdminNav onNavigate={() => setOpen(false)} />
        {footer}
      </aside>

      {/* desktop: fixed sidebar */}
      <aside className="hidden bg-granite p-5 text-snow md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="mb-8">{logoEl}</div>
        <AdminNav />
        {footer}
      </aside>
    </>
  );
}
