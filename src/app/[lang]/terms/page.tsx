import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { isLang, t } from "@/lib/i18n";
import { settingsText } from "@/lib/localize";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return { title: t(isLang(lang) ? lang : "sv").meta.terms };
}

export default async function Terms({ params }: Props) {
  const { lang: l } = await params;
  const lang = isLang(l) ? l : "sv";
  const d = t(lang).terms;
  const settings = await getSettings();
  const text = settingsText(settings, lang);
  return (
    <div className="mx-auto max-w-3xl px-5 pt-12">
      <h1 className="rise text-4xl font-semibold sm:text-5xl">{d.title}</h1>
      <p className="mt-4 text-lg text-fjord">{d.intro(settings.brandName)}</p>
      <div className="mt-10 space-y-10">
        {text.policies.map((p) => (
          <section key={p.title}>
            <h2 className="font-sans text-xl font-semibold tracking-normal">{p.title}</h2>
            <div className="prose-np mt-2 max-w-prose text-fjord">
              {p.text.split(/\n\s*\n/).map((x, i) => <p key={i}>{x}</p>)}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-12">
        {d.questions}{" "}
        {settings.instagram && (
          <a className="font-semibold underline" href={settings.instagram} target="_blank" rel="noopener">{d.questionsDm}</a>
        )}
        {settings.email && (
          <>
            {settings.instagram ? ". " : ""}
            {d.questionsMail} <a className="font-semibold underline" href={`mailto:${settings.email}`}>{settings.email}</a>
          </>
        )}
      </p>
    </div>
  );
}
