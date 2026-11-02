"use client";

import { createContext, useContext, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_LANG_COOKIE, adminT, type AdminLang } from "@/lib/admin-i18n";

const Ctx = createContext<AdminLang>("sv");

export function AdminI18nProvider({ lang, children }: { lang: AdminLang; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export function useAdminT() {
  const lang = useContext(Ctx);
  return { lang, t: adminT(lang) };
}

/**
 * SV / EN switch. Stores the choice in a cookie and re-renders the current page in place,
 * so unsaved form input is kept.
 */
export function AdminLangSwitch({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { lang, t } = useAdminT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (l: AdminLang) => {
    if (l === lang) return;
    document.cookie = `${ADMIN_LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    start(() => router.refresh());
  };
  const base = tone === "dark" ? "bg-white/8 ring-white/15" : "bg-snow ring-mist";
  const activeCls = tone === "dark" ? "bg-white text-granite" : "bg-granite text-snow";
  const idleCls = tone === "dark" ? "text-mist hover:text-white" : "text-fjord hover:text-granite";
  return (
    <div role="group" aria-label={t.switchLabel} className={`inline-flex rounded-full p-1 ring-1 ${base} ${pending ? "opacity-60" : ""}`}>
      {(["sv", "en"] as AdminLang[]).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          onClick={() => set(l)}
          className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-colors ${lang === l ? activeCls : idleCls}`}
          title={l === "sv" ? "Svenska" : "English"}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
