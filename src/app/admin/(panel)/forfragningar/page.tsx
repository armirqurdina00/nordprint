import Link from "next/link";
import { getContent } from "@/lib/db";
import { formatDate } from "@/lib/format";
import StatusPill from "@/components/admin/StatusPill";
import type { InquiryStatus } from "@/lib/types";

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Aktiva" },
  { value: "ny", label: "Nya" },
  { value: "pågår", label: "Pågår" },
  { value: "klar", label: "Klara" },
  { value: "arkiverad", label: "Arkiverade" },
];

export default async function Inquiries({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const { inquiries, products } = await getContent();
  const list = status ? inquiries.filter((q) => q.status === (status as InquiryStatus)) : inquiries.filter((q) => q.status !== "arkiverad");
  const productName = (slug: string) => products.find((p) => p.slug === slug)?.sv.name ?? "Egen idé";

  return (
    <>
      <h1 className="font-sans text-3xl font-semibold tracking-normal">Förfrågningar</h1>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filtrera">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/forfragningar?status=${encodeURIComponent(f.value)}` : "/admin/forfragningar"}
            aria-current={status === f.value ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 font-medium ring-1 ${status === f.value ? "bg-granite text-snow ring-granite" : "ring-mist hover:ring-granite"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-paper p-6 text-fjord ring-1 ring-mist">Inga förfrågningar med den här statusen.</p>
      ) : (
        <ul className="mt-6 divide-y divide-mist overflow-hidden rounded-2xl bg-paper ring-1 ring-mist">
          {list.map((q) => (
            <li key={q.id}>
              <Link href={`/admin/forfragningar/${q.id}`} className="grid gap-1 px-5 py-4 hover:bg-snow sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {q.name} <span className="font-normal text-fjord">om {productName(q.productSlug)}{q.quantity && q.quantity !== "1" ? `, ${q.quantity} st` : ""}</span>
                  </p>
                  <p className="truncate text-fjord">{q.message}</p>
                </div>
                <div className="flex items-center gap-4">
                  {q.lang === "en" && <span className="rounded-full bg-snow px-2 py-0.5 text-xs font-semibold ring-1 ring-mist" title="Skickad från den engelska sidan">EN</span>}
                  {q.files.length > 0 && <span className="text-sm text-fjord">{q.files.length} filer</span>}
                  <StatusPill status={q.status} />
                  <span className="text-sm text-fjord">{formatDate(q.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
