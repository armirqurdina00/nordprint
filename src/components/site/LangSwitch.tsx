"use client";

import { usePathname } from "next/navigation";
import { switchPath } from "@/lib/routes";
import type { Lang } from "@/lib/types";

export default function LangSwitch({ lang, label, text, className = "" }: { lang: Lang; label: string; text: string; className?: string }) {
  const pathname = usePathname();
  const other: Lang = lang === "sv" ? "en" : "sv";
  const target = switchPath(pathname)[other];
  return (
    // a full page load, so the root <html lang> is rendered for the new language
    <a
      href={target}
      hrefLang={other}
      lang={other}
      title={label}
      className={className}
      onClick={() => {
        document.cookie = `np_lang=${other}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      }}
    >
      {text}
    </a>
  );
}
