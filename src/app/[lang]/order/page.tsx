import type { Metadata } from "next";
import { getPublishedProducts, getSettings } from "@/lib/db";
import { isLang, t } from "@/lib/i18n";
import { localProduct, settingsText } from "@/lib/localize";
import { PRODUCT_PARAM } from "@/lib/routes";
import OrderForm from "@/components/site/OrderForm";
import { directUploads } from "@/lib/uploads";

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

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-5 pt-12 md:grid-cols-[1fr_1.5fr]">
      <div>
        <h1 className="text-4xl font-semibold sm:text-5xl">{d.title}</h1>
        <p className="mt-4 max-w-md text-lg text-fjord">{d.intro}</p>
        <ol className="mt-10 space-y-5">
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
          <p className="mt-10 text-fjord">
            {d.preferDm}{" "}
            <a href={settings.instagram} target="_blank" rel="noopener" className="font-semibold text-granite underline underline-offset-4 hover:text-hallon">{d.dmLink}</a>
          </p>
        )}
      </div>
      <OrderForm
        lang={lang}
        direct={directUploads}
        products={products.map((p) => ({ slug: p.slug, name: p.name, colors: p.colors }))}
        initialSlug={products.some((p) => p.slug === wanted) ? wanted : ""}
      />
    </div>
  );
}
