import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t } from "@/lib/i18n";
import { ANCHORS, href } from "@/lib/routes";
import Logo from "./Logo";
import LangSwitch from "./LangSwitch";
import MobileMenu from "./MobileMenu";

export default function Header({ lang, announcement, logo, instagram }: { lang: Lang; announcement: string; logo: string; instagram: string }) {
  const d = t(lang);
  const home = href(lang, "home");
  const nav = [
    { href: href(lang, "products"), label: d.nav.products },
    { href: `${home}#${ANCHORS[lang].how}`, label: d.nav.how },
    { href: `${home}#${ANCHORS[lang].faq}`, label: d.nav.faq },
    { href: href(lang, "terms"), label: d.nav.terms },
  ];
  const switchProps = { lang, label: d.switchLabel, text: d.switchTo };
  return (
    <header className="sticky top-0 z-40">
      {announcement && <p className="bg-granite px-4 py-2 text-center text-sm text-snow">{announcement}</p>}
      <div className="border-b border-mist/80 bg-snow/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href={home} aria-label={d.homeLabel} className="flex shrink-0 items-center text-granite">
            <Logo src={logo} />
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label={d.nav.main}>
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-[0.95rem] font-medium hover:text-hallon">
                {n.label}
              </Link>
            ))}
            <LangSwitch {...switchProps} className="rounded-full px-3 py-1.5 text-[0.9rem] font-medium text-fjord ring-1 ring-mist hover:text-granite hover:ring-granite" />
            <Link href={href(lang, "order")} className="btn btn-primary py-2.5">
              {d.nav.order}
            </Link>
          </nav>
          <MobileMenu
            lang={lang}
            items={nav}
            order={{ href: href(lang, "order"), label: d.nav.order }}
            switchText={d.switchTo}
            switchLabel={d.switchLabel}
            instagram={instagram}
            openLabel={d.nav.menu}
            closeLabel={d.nav.close}
            navLabel={d.nav.main}
          />
        </div>
      </div>
    </header>
  );
}
