import Link from "next/link";
import { getContent } from "@/lib/db";
import { formatDate } from "@/lib/format";
import StatusPill from "@/components/admin/StatusPill";

export default async function Dashboard() {
  const { products, inquiries } = await getContent();
  const stats = [
    { label: "Nya förfrågningar", value: inquiries.filter((i) => i.status === "ny").length, href: "/admin/forfragningar?status=ny" },
    { label: "Pågående", value: inquiries.filter((i) => i.status === "pågår").length, href: "/admin/forfragningar?status=pågår" },
    { label: "Publicerade produkter", value: products.filter((p) => p.published).length, href: "/admin/produkter" },
    { label: "Utkast", value: products.filter((p) => !p.published).length, href: "/admin/produkter" },
  ];
  const latest = inquiries.slice(0, 5);
  const missingPhotos = products.filter((p) => p.published && p.images.length === 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-3xl font-semibold tracking-normal">Översikt</h1>
        <Link href="/admin/produkter/ny" className="btn btn-primary">Ny produkt</Link>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl bg-paper p-5 ring-1 ring-mist hover:ring-granite">
            <p className="font-display text-3xl font-semibold tabular-nums">{s.value}</p>
            <p className="mt-1 text-fjord">{s.label}</p>
          </Link>
        ))}
      </div>

      {missingPhotos.length > 0 && (
        <div className="mt-6 rounded-2xl bg-hallon-soft p-5">
          <p className="font-semibold">{missingPhotos.length} publicerade produkter saknar foto</p>
          <p className="mt-1 text-fjord">
            De visas med en färgplatta tills du laddar upp en bild:{" "}
            {missingPhotos.map((p, i) => (
              <span key={p.id}>
                <Link className="font-medium text-granite underline" href={`/admin/produkter/${p.id}`}>{p.sv.name}</Link>
                {i < missingPhotos.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-xl font-semibold tracking-normal">Senaste förfrågningar</h2>
          <Link href="/admin/forfragningar" className="font-medium underline underline-offset-4">Visa alla</Link>
        </div>
        {latest.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-paper p-6 text-fjord ring-1 ring-mist">
            Inga förfrågningar än. De dyker upp här när någon skickar beställningsformuläret.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-mist overflow-hidden rounded-2xl bg-paper ring-1 ring-mist">
            {latest.map((q) => (
              <li key={q.id}>
                <Link href={`/admin/forfragningar/${q.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-snow">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{q.name}</p>
                    <p className="truncate text-fjord">{q.message}</p>
                  </div>
                  <StatusPill status={q.status} />
                  <p className="hidden text-sm text-fjord sm:block">{formatDate(q.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
