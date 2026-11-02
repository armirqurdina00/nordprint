import Link from "next/link";
import { getPublishedProducts, getSettings } from "@/lib/db";
import { isLang, t } from "@/lib/i18n";
import { localProduct, settingsText } from "@/lib/localize";
import { ANCHORS, href } from "@/lib/routes";
import ProductCard from "@/components/site/ProductCard";
import Faq from "@/components/site/Faq";
import PrintHero from "./HeroCanvas";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params;
  const lang = isLang(l) ? l : "sv";
  const d = t(lang);
  const [settings, all] = await Promise.all([getSettings(), getPublishedProducts()]);
  const text = settingsText(settings, lang);
  const products = all.map((p) => localProduct(p, lang));
  const featured = [...products.filter((p) => p.featured), ...products.filter((p) => !p.featured)].slice(0, 5);
  const [lead, ...rest] = featured;

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-16 pt-10 md:grid-cols-[1.05fr_1fr] md:pt-16">
        <div>
          <h1 className="text-[2.6rem] font-semibold sm:text-6xl lg:text-[4.4rem]">{text.heroTitle}</h1>
          <p className="mt-6 max-w-[34rem] text-lg text-fjord sm:text-xl">{text.heroText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={href(lang, "products")} className="btn btn-primary">{d.home.seeProducts}</Link>
            <Link href={href(lang, "order")} className="btn btn-ghost">{d.home.customDesign}</Link>
          </div>
          <p className="mt-8 flex items-center gap-2 text-sm font-medium text-fjord">
            <span aria-hidden className="inline-block h-3 w-4 rounded-[2px] bg-[linear-gradient(#006aa7_0_40%,#fecc02_40%_60%,#006aa7_60%)]" />
            {d.home.madeIn}
          </p>
        </div>
        <div className="print-layers relative h-[420px] overflow-hidden rounded-[28px] bg-[#e2e9eb] sm:h-[520px]">
          <PrintHero lang={lang} />
        </div>
      </section>

      {lead && (
        <section className="mx-auto max-w-6xl px-5 py-16" aria-labelledby="range">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 id="range" className="text-3xl font-semibold sm:text-4xl">{d.home.fromRange}</h2>
            <Link href={href(lang, "products")} className="font-semibold underline decoration-2 underline-offset-4 hover:text-hallon">
              {d.home.allProducts(products.length)}
            </Link>
          </div>
          <div className="grid items-start gap-8 md:grid-cols-2">
            <ProductCard product={lead} lang={lang} large />
            <div className="grid grid-cols-2 gap-x-5 gap-y-8">
              {rest.map((p) => (
                <ProductCard key={p.id} product={p} lang={lang} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-16" aria-labelledby="services">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <h2 id="services" className="text-3xl font-semibold sm:text-4xl">{d.home.services}</h2>
          <dl className="grid gap-x-10 sm:grid-cols-2">
            {text.services.map((s) => (
              <div key={s.title} className="border-t-2 border-granite py-5">
                <dt className="text-lg font-semibold">{s.title}</dt>
                <dd className="mt-1.5 text-fjord">{s.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id={ANCHORS[lang].how} className="scroll-mt-24 bg-granite py-20 text-snow" aria-labelledby="process">
        <div className="mx-auto max-w-6xl px-5">
          <h2 id="process" className="max-w-xl text-3xl font-semibold sm:text-4xl">{d.home.process}</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
            {text.steps.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-hallon font-display font-semibold">{i + 1}</span>
                  {i < text.steps.length - 1 && (
                    <span aria-hidden className="hidden h-px flex-1 bg-[repeating-linear-gradient(90deg,#4f6873_0_6px,transparent_6px_10px)] md:block" />
                  )}
                </div>
                <h3 className="mt-5 font-sans text-lg font-semibold tracking-normal">{s.title}</h3>
                <p className="mt-1.5 text-mist">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2" aria-labelledby="about">
        <h2 id="about" className="text-3xl font-semibold sm:text-4xl">{text.aboutTitle}</h2>
        <p className="max-w-prose text-lg text-fjord">{text.aboutText}</p>
      </section>

      <section id={ANCHORS[lang].faq} className="mx-auto max-w-3xl scroll-mt-24 px-5 py-10" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-3xl font-semibold sm:text-4xl">{d.home.faq}</h2>
        <Faq items={text.faq} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-16">
        <div className="print-layers flex flex-col items-start justify-between gap-6 rounded-[28px] bg-hallon-soft px-8 py-12 md:flex-row md:items-center md:px-12">
          <div>
            <h2 className="text-3xl font-semibold">{d.home.ctaTitle}</h2>
            <p className="mt-2 max-w-md text-fjord">{d.home.ctaText}</p>
          </div>
          <Link href={href(lang, "order")} className="btn btn-primary">{d.home.ctaButton}</Link>
        </div>
      </section>
    </>
  );
}
