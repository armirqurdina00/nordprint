import Link from "next/link";
import type { Lang, Settings } from "@/lib/types";
import { t } from "@/lib/i18n";
import { ANCHORS, href } from "@/lib/routes";
import Logo from "./Logo";
import LangSwitch from "./LangSwitch";

export default function Footer({ lang, settings }: { lang: Lang; settings: Settings }) {
  const d = t(lang);
  return (
    <footer className="mt-28 bg-granite text-snow">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          {settings.logo ? <Logo src={settings.logo} className="rounded bg-white p-1.5" /> : <Logo variant="stacked" />}
          <p className="mt-4 max-w-sm text-mist">{d.footer.tagline(settings.location)}</p>
        </div>
        <div>
          <h2 className="font-sans text-base font-semibold">{d.footer.contact}</h2>
          <ul className="mt-3 space-y-2 text-mist">
            {settings.instagram && (
              <li><a className="hover:text-white" href={settings.instagram} rel="noopener" target="_blank">Instagram @nordprint.3s</a></li>
            )}
            {settings.email && (
              <li><a className="hover:text-white" href={`mailto:${settings.email}`}>{settings.email}</a></li>
            )}
            <li><Link className="hover:text-white" href={href(lang, "order")}>{d.footer.sendRequest}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-sans text-base font-semibold">{d.footer.info}</h2>
          <ul className="mt-3 space-y-2 text-mist">
            <li><Link className="hover:text-white" href={href(lang, "products")}>{d.footer.allProducts}</Link></li>
            <li><Link className="hover:text-white" href={href(lang, "terms")}>{d.footer.terms}</Link></li>
            <li><Link className="hover:text-white" href={`${href(lang, "home")}#${ANCHORS[lang].faq}`}>{d.footer.faq}</Link></li>
            <li><LangSwitch lang={lang} label={d.switchLabel} text={d.switchTo} className="hover:text-white" /></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-5 text-sm text-mist/80">
          <p>© {new Date().getFullYear()} {settings.brandName}{settings.orgNumber ? `, ${d.footer.orgNr} ${settings.orgNumber}` : ""}</p>
          <Link href="/admin" className="hover:text-white">{d.footer.login}</Link>
        </div>
      </div>
    </footer>
  );
}
