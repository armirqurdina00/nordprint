import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedProducts } from "@/lib/db";
import { isLang, t } from "@/lib/i18n";
import { localProduct } from "@/lib/localize";
import { CATEGORY_PARAM, href } from "@/lib/routes";
import ProductCard from "@/components/site/ProductCard";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return { title: t(isLang(lang) ? lang : "sv").meta.products };
}

export default async function Products({ params, searchParams }: Props) {
  const [{ lang: l }, query] = await Promise.all([params, searchParams]);
  const lang = isLang(l) ? l : "sv";
  const d = t(lang).products;
  const category = query[CATEGORY_PARAM[lang]];
  const all = (await getPublishedProducts()).map((p) => localProduct(p, lang));
  const categories = [...new Set(all.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, lang));
  const products = category ? all.filter((p) => p.category === category) : all;
  const base = href(lang, "products");

  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-[0.95rem] font-medium ring-1 ${active ? "bg-granite text-snow ring-granite" : "ring-mist hover:ring-granite"}`;

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12">
      <h1 className="rise text-4xl font-semibold sm:text-5xl">{d.title}</h1>
      <p className="rise mt-3 max-w-xl text-lg text-fjord" style={{ "--d": 1 } as React.CSSProperties}>{d.intro}</p>
      <nav className="rise mt-8 flex flex-wrap gap-2" style={{ "--d": 2 } as React.CSSProperties} aria-label={d.categories}>
        <Link href={base} className={chip(!category)} aria-current={!category ? "page" : undefined}>{d.all}</Link>
        {categories.map((c) => (
          <Link key={c} href={`${base}?${CATEGORY_PARAM[lang]}=${encodeURIComponent(c)}`} className={chip(category === c)} aria-current={category === c ? "page" : undefined}>
            {c}
          </Link>
        ))}
      </nav>
      {products.length === 0 ? (
        <p className="mt-12 text-fjord">
          {d.empty} <Link href={base} className="font-semibold underline">{d.showAll}</Link>
        </p>
      ) : (
        <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => <ProductCard key={p.id} product={p} lang={lang} reveal={i % 3} />)}
        </div>
      )}
    </div>
  );
}
