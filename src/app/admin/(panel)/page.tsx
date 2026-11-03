import Link from "next/link";
import { getContent } from "@/lib/db";
import { formatDate } from "@/lib/format";
import StatusPill from "@/components/admin/StatusPill";
import { getAdminLang, getAdminT } from "@/lib/admin-lang";
import { productText } from "@/lib/localize";
import { chatSummary } from "@/lib/chat";

export default async function Dashboard() {
  const [{ products, inquiries }, t, chat, lang] = await Promise.all([getContent(), getAdminT(), chatSummary(), getAdminLang()]);
  const stats = [
    { label: t.dashboard.statNew, value: inquiries.filter((i) => i.status === "ny").length, href: "/admin/forfragningar?status=ny" },
    { label: t.dashboard.statOngoing, value: inquiries.filter((i) => i.status === "pågår").length, href: "/admin/forfragningar?status=pågår" },
    { label: t.dashboard.statPublished, value: products.filter((p) => p.published).length, href: "/admin/produkter" },
    { label: t.dashboard.statDrafts, value: products.filter((p) => !p.published).length, href: "/admin/produkter" },
  ];
  const latest = inquiries.slice(0, 5);
  const missingPhotos = products.filter((p) => p.published && p.images.length === 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-3xl font-semibold tracking-normal">{t.dashboard.title}</h1>
        <Link href="/admin/produkter/ny" className="btn btn-primary">{t.dashboard.newProduct}</Link>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl bg-paper p-5 ring-1 ring-mist hover:ring-granite">
            <p className="font-display text-3xl font-semibold tabular-nums">{s.value}</p>
            <p className="mt-1 text-fjord">{s.label}</p>
          </Link>
        ))}
      </div>

      {chat.unread > 0 && (
        <Link href="/admin/chatt" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-granite p-5 text-snow hover:bg-granite/90">
          <p className="font-semibold">{t.chat.unreadBanner(chat.unread)}</p>
          <span className="btn btn-primary px-4 py-2.5 text-sm">{t.chat.openChat}</span>
        </Link>
      )}

      {missingPhotos.length > 0 && (
        <div className="mt-6 rounded-2xl bg-hallon-soft p-5">
          <p className="font-semibold">{t.dashboard.missingPhotos(missingPhotos.length)}</p>
          <p className="mt-1 text-fjord">
            {t.dashboard.missingPhotosText}{" "}
            {missingPhotos.map((p, i) => (
              <span key={p.id}>
                <Link className="font-medium text-granite underline" href={`/admin/produkter/${p.id}`}>{productText(p, lang).name}</Link>
                {i < missingPhotos.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-xl font-semibold tracking-normal">{t.dashboard.latest}</h2>
          <Link href="/admin/forfragningar" className="font-medium underline underline-offset-4">{t.dashboard.showAll}</Link>
        </div>
        {latest.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-paper p-6 text-fjord ring-1 ring-mist">
            {t.dashboard.empty}
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
                  <StatusPill status={q.status} t={t} />
                  <p className="hidden text-sm text-fjord sm:block">{formatDate(q.createdAt, t.locale)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
