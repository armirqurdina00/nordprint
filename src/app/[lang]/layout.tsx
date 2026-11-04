import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { getSettings } from "@/lib/db";
import { isLang, t } from "@/lib/i18n";
import { settingsText } from "@/lib/localize";
import type { Lang } from "@/lib/types";
import ChatWidget from "@/components/site/ChatWidget";
import { chatEnabled } from "@/lib/chat";
import { blobMode } from "@/lib/uploads";
import ScrollReveal from "@/components/site/ScrollReveal";

type Props = { children: React.ReactNode; params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const d = t(lang).meta;
  return {
    title: { default: d.title, template: "%s | NordPrint Studio" },
    description: d.description,
    alternates: { languages: { sv: "/", en: "/en" } },
  };
}

export default async function SiteLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const settings = await getSettings();
  const text = settingsText(settings, lang as Lang);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-paper focus:px-4 focus:py-2">
        {t(lang).skip}
      </a>
      <Header lang={lang} announcement={text.announcement} logo={settings.logo} instagram={settings.instagram} />
      <main id="main">{children}</main>
      <Footer lang={lang} settings={settings} />
      <ScrollReveal />
      {chatEnabled && <ChatWidget lang={lang as Lang} direct={blobMode} />}
    </>
  );
}
