import type { Metadata } from "next";
import { getPublishedProducts, getSettings } from "@/lib/db";
import { isLang, t } from "@/lib/i18n";
import { localProduct, settingsText } from "@/lib/localize";
import { PRODUCT_PARAM } from "@/lib/routes";
import OrderForm from "@/components/site/OrderForm";
import { blobMode } from "@/lib/uploads";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return { title: t(isLang(lang) ? lang : "sv").meta.order };
}

export default async function Order({ params, searchParams }: Props) {
  const [{ lang: l }, query] = await Promise.all([params, searchParams]);
  const lang = isLang(l) ? l : "sv";
  const d = t(lang).order;
  const [all, settings] = await Promise.all([getPublishedProducts(), getSettings()]);
  const products = all.map((p) => localProduct(p, lang));
  const text = settingsText(settings, lang);
  const wanted = query[PRODUCT_PARAM[lang]];

  // DOM order is intro, form, steps: on phones the form comes right after the heading.
  // On wider screens a grid puts the intro and steps in the left column and the form on the right.
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 pt-8 sm:pt-12 md:grid-cols-[1fr_1.5fr] md:grid-rows-[auto_1fr] md:gap-x-12 md:gap-y-10">
      <header className="md:col-start-1 md:row-start-1">
        <h1 className="text-4xl font-semibold sm:text-5xl">{d.title}</h1>
        <p className="mt-3 max-w-md text-lg text-fjord sm:mt-4">{d.intro}</p>
      </header>

      <div className="md:col-start-2 md:row-span-2 md:row-start-1">
        <OrderForm
          lang={lang}
          direct={blobMode}
          products={products.map((p) => ({ slug: p.slug, name: p.name, colors: p.colors, image: p.images[0], category: p.category }))}
          initialSlug={products.some((p) => p.slug === wanted) ? wanted : ""}
        />
      </div>

      <aside className="md:col-start-1 md:row-start-2" aria-labelledby="order-steps">
        <h2 id="order-steps" className="font-sans text-lg font-semibold tracking-normal">{t(lang).home.process}</h2>
        <ol className="mt-5 space-y-5">
          {text.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-granite font-display text-sm font-semibold text-snow">{i + 1}</span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-fjord">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        {settings.instagram && (
          <p className="mt-8 text-fjord">
            {d.preferDm}{" "}
            <a href={settings.instagram} target="_blank" rel="noopener" className="font-semibold text-granite underline underline-offset-4 hover:text-hallon">{d.dmLink}</a>
          </p>
        )}
      </aside>
    </div>
  );
}
