import Link from "next/link";
import { getContent } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import ProductImage from "@/components/site/ProductImage";
import { moveProduct, togglePublished } from "../../actions";

export default async function AdminProducts() {
  const products = (await getContent()).products.sort((a, b) => a.order - b.order);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-semibold tracking-normal">Produkter</h1>
          <p className="mt-1 text-fjord">Ordningen här är samma som på webbplatsen.</p>
        </div>
        <Link href="/admin/produkter/ny" className="btn btn-primary">Ny produkt</Link>
      </div>
      {products.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-paper p-6 ring-1 ring-mist">
          Inga produkter än. <Link href="/admin/produkter/ny" className="font-semibold underline">Lägg till den första</Link>.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-mist overflow-hidden rounded-2xl bg-paper ring-1 ring-mist">
          {products.map((p, i) => (
            <li key={p.id} className="flex items-center gap-4 px-4 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                <ProductImage product={{ ...p, name: p.sv.name }} className="[&>span]:p-1.5 [&>span]:text-xs" />
              </div>
              <Link href={`/admin/produkter/${p.id}`} className="min-w-0 flex-1 hover:text-hallon">
                <p className="truncate font-semibold">{p.sv.name}</p>
                <p className="text-sm text-fjord">
                  {p.sv.category || "Ingen kategori"}, {p.price === null ? "pris på förfrågan" : formatPrice(p.price)}
                  {p.featured ? ", visas på startsidan" : ""}
                  {!p.en.name && <span className="ml-2 rounded-full bg-hallon-soft px-2 py-0.5 text-xs font-medium text-hallon-dark">Saknar engelska</span>}
                </p>
              </Link>
              <form action={togglePublished}>
                <input type="hidden" name="id" value={p.id} />
                <button
                  className={`rounded-full px-3 py-1 text-sm font-medium ${p.published ? "bg-emerald-100 text-emerald-900" : "bg-mist text-fjord"}`}
                  title={p.published ? "Klicka för att dölja" : "Klicka för att publicera"}
                >
                  {p.published ? "Publicerad" : "Utkast"}
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
                      aria-label={dir === "up" ? `Flytta upp ${p.sv.name}` : `Flytta ner ${p.sv.name}`}
                    >
                      {dir === "up" ? "↑" : "↓"}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
