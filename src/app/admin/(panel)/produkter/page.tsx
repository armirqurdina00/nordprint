import Link from "next/link";
import { getContent } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import ProductImage from "@/components/site/ProductImage";
import { moveProduct, togglePublished } from "../../actions";
import { getAdminLang, getAdminT } from "@/lib/admin-lang";
import { productText } from "@/lib/localize";

export default async function AdminProducts() {
  const [content, t, lang] = await Promise.all([getContent(), getAdminT(), getAdminLang()]);
  const products = content.products.sort((a, b) => a.order - b.order);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-semibold tracking-normal">{t.products.title}</h1>
          <p className="mt-1 text-fjord">{t.products.intro}</p>
        </div>
        <Link href="/admin/produkter/ny" className="btn btn-primary">{t.products.newProduct}</Link>
      </div>
      {products.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-paper p-6 ring-1 ring-mist">
          {t.products.empty} <Link href="/admin/produkter/ny" className="font-semibold underline">{t.products.addFirst}</Link>.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-mist overflow-hidden rounded-2xl bg-paper ring-1 ring-mist">
          {products.map((p, i) => {
            const text = productText(p, lang);
            return (
            <li key={p.id} className="flex items-center gap-4 px-4 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                <ProductImage product={{ ...p, name: text.name }} className="[&>span]:p-1.5 [&>span]:text-xs" />
              </div>
              <Link href={`/admin/produkter/${p.id}`} className="min-w-0 flex-1 hover:text-hallon">
                <p className="truncate font-semibold">{text.name}</p>
                <p className="text-sm text-fjord">
                  {text.category || t.products.noCategory}, {p.price === null ? t.products.onRequest : formatPrice(p.price, t.locale === "en-GB" ? "en" : "sv")}
                  {p.featured ? t.products.onHome : ""}
                  {!p.en.name && <span className="ml-2 rounded-full bg-hallon-soft px-2 py-0.5 text-xs font-medium text-hallon-dark">{t.products.missingEnglish}</span>}
                </p>
              </Link>
              <form action={togglePublished}>
                <input type="hidden" name="id" value={p.id} />
                <button
                  className={`rounded-full px-3 py-1 text-sm font-medium ${p.published ? "bg-emerald-100 text-emerald-900" : "bg-mist text-fjord"}`}
                  title={p.published ? t.products.clickToHide : t.products.clickToPublish}
                >
                  {p.published ? t.products.published : t.products.draft}
                </button>
              </form>
              <div className="flex gap-1">
                {(["up", "down"] as const).map((dir) => (
                  <form key={dir} action={moveProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="dir" value={dir} />
                    <button
                      disabled={dir === "up" ? i === 0 : i === products.length - 1}
                      className="grid h-8 w-8 place-items-center rounded-full ring-1 ring-mist hover:ring-granite disabled:opacity-30"
                      aria-label={dir === "up" ? t.products.moveUp(text.name) : t.products.moveDown(text.name)}
                    >
                      {dir === "up" ? "↑" : "↓"}
                    </button>
                  </form>
                ))}
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
