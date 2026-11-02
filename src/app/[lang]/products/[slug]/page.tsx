import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getPublishedProducts } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { isLang, t } from "@/lib/i18n";
import { localProduct } from "@/lib/localize";
import { CATEGORY_PARAM, PRODUCT_PARAM, href } from "@/lib/routes";
import ProductImage from "@/components/site/ProductImage";
import ProductCard from "@/components/site/ProductCard";

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || !isLang(lang)) return {};
  const lp = localProduct(p, lang);
  return { title: lp.name, description: lp.tagline, openGraph: lp.images[0] ? { images: [lp.images[0]] } : undefined };
}

export default async function ProductPage({ params }: Props) {
  const { lang: l, slug } = await params;
  const lang = isLang(l) ? l : "sv";
  const d = t(lang).products;
  const raw = await getProductBySlug(slug);
  if (!raw) notFound();
  const product = localProduct(raw, lang);
  const related = (await getPublishedProducts())
    .map((p) => localProduct(p, lang))
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 3);
  const extra = product.images.slice(1);
  const base = href(lang, "products");

  const facts = [
    [d.material, product.material],
    [d.dimensions, product.dimensions],
    [d.leadTime, product.leadTime],
  ].filter(([, v]) => v);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8">
      <nav className="text-sm text-fjord" aria-label={d.breadcrumb}>
        <Link href={base} className="hover:text-hallon">{d.title}</Link>
        {product.category && (
          <>
            {" / "}
            <Link href={`${base}?${CATEGORY_PARAM[lang]}=${encodeURIComponent(product.category)}`} className="hover:text-hallon">{product.category}</Link>
          </>
        )}
      </nav>
      <div className="mt-6 grid gap-10 md:grid-cols-[1.15fr_1fr]">
        <div className="grid gap-4">
          <div className="aspect-[4/5] overflow-hidden rounded-[22px] bg-mist">
            <ProductImage product={product} sizes="lg" soonLabel={d.imageSoon} />
          </div>
          {extra.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {extra.map((_, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-[18px]">
                  <ProductImage product={product} index={i + 1} soonLabel={d.imageSoon} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="md:sticky md:top-28 md:self-start">
          <h1 className="text-4xl font-semibold sm:text-5xl">{product.name}</h1>
          <p className="mt-3 text-xl text-fjord">{product.tagline}</p>
          <p className="mt-6 text-2xl font-semibold tabular-nums">
            {product.price === null ? d.onRequest : formatPrice(product.price, lang)}
            {product.price !== null && product.priceNote && <span className="ml-2 text-base font-normal text-fjord">{product.priceNote}</span>}
          </p>
          {product.colors.length > 0 && (
            <div className="mt-6">
              <p className="font-semibold">{d.availableIn(product.colors.length)}</p>
              <ul className="mt-2 flex gap-2">
                {product.colors.map((c) => (
                  <li key={c} className="h-8 w-8 rounded-full ring-1 ring-black/10" style={{ background: c }} title={c} />
                ))}
              </ul>
            </div>
          )}
          <Link href={`${href(lang, "order")}?${PRODUCT_PARAM[lang]}=${product.slug}`} className="btn btn-primary mt-8 w-full sm:w-auto">
            {d.orderThis(product.name.split(",")[0])}
          </Link>
          <div className="prose-np mt-8 max-w-prose">
            {product.description.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
          {facts.length > 0 && (
            <dl className="mt-8 divide-y divide-mist border-y border-mist">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3">
                  <dt className="text-fjord">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {product.instagram && (
            <a href={product.instagram} target="_blank" rel="noopener" className="mt-6 inline-block font-medium underline underline-offset-4 hover:text-hallon">
              {d.seeOnInstagram}
            </a>
          )}
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related">
          <h2 id="related" className="text-2xl font-semibold sm:text-3xl">{d.moreIn(product.category)}</h2>
          <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => <ProductCard key={p.id} product={p} lang={lang} />)}
          </div>
        </section>
      )}
    </div>
  );
}
