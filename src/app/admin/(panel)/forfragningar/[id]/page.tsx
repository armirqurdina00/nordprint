import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/db";
import { formatDate } from "@/lib/format";
import InquiryForm from "@/components/admin/InquiryForm";
import StatusPill from "@/components/admin/StatusPill";
import { ConfirmButton } from "@/components/admin/ui";
import { deleteInquiry } from "../../../actions";
import { getAdminT } from "@/lib/admin-lang";

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ inquiries, products }, t] = await Promise.all([getContent(), getAdminT()]);
  const q = inquiries.find((x) => x.id === id);
  if (!q) notFound();
  const product = products.find((p) => p.slug === q.productSlug);
  const first = q.name.split(" ")[0];
  const reply =
    q.lang === "en"
      ? `mailto:${q.email}?subject=${encodeURIComponent("Your request at NordPrint Studio")}&body=${encodeURIComponent(`Hi ${first},\n\nThanks for your request!\n\n`)}`
      : `mailto:${q.email}?subject=${encodeURIComponent("Din förfrågan hos NordPrint Studio")}&body=${encodeURIComponent(`Hej ${first},\n\nTack för din förfrågan!\n\n`)}`;

  return (
    <>
      <Link href="/admin/forfragningar" className="text-fjord hover:text-granite">{t.inquiry.all}</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-sans text-3xl font-semibold tracking-normal">{q.name}</h1>
        <StatusPill status={q.status} t={t} />
      </div>
      <p className="mt-1 text-fjord">
        {t.inquiry.sent(formatDate(q.createdAt, t.locale))}
        {q.lang === "en" && <span className="ml-2 font-semibold text-granite">{t.inquiry.englishNote}</span>}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-paper p-6 ring-1 ring-mist">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="hint">{t.inquiry.concerns}</dt><dd className="font-medium">{product ? <Link className="underline" href={`/admin/produkter/${product.id}`}>{product.sv.name}</Link> : t.inquiry.customIdeaOrFile}</dd></div>
              <div><dt className="hint">{t.inquiry.quantity}</dt><dd className="font-medium">{q.quantity || "1"}</dd></div>
              <div><dt className="hint">{t.inquiry.email}</dt><dd className="font-medium"><a className="underline" href={`mailto:${q.email}`}>{q.email}</a></dd></div>
              <div><dt className="hint">{t.inquiry.phone}</dt><dd className="font-medium">{q.phone ? <a className="underline" href={`tel:${q.phone}`}>{q.phone}</a> : t.inquiry.notGiven}</dd></div>
            </dl>
            <h2 className="hint mt-6">{t.inquiry.message}</h2>
            <p className="mt-1 whitespace-pre-wrap">{q.message}</p>
          </section>
          {q.files.length > 0 && (
            <section className="rounded-2xl bg-paper p-6 ring-1 ring-mist">
              <h2 className="font-semibold">{t.inquiry.attachments}</h2>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {q.files.map((f) => {
                  const isImg = /\.(jpe?g|png|webp|gif|avif)$/i.test(f);
                  return (
                    <li key={f}>
                      <a href={f} target="_blank" className="block overflow-hidden rounded-xl ring-1 ring-mist hover:ring-granite">
                        {isImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f} alt="" className="aspect-square w-full object-cover" />
                        ) : (
                          <span className="grid aspect-square place-items-center bg-snow p-3 text-center text-sm font-medium break-all">
                            {f.split("/").pop()?.replace(/^[a-z0-9]+-/, "")}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
        <div className="space-y-4">
          <a href={reply} className="btn btn-primary w-full">{t.inquiry.reply}</a>
          <InquiryForm inquiry={q} />
          <form action={deleteInquiry}>
            <input type="hidden" name="id" value={q.id} />
            <ConfirmButton confirmText={t.common.clickAgainToDelete}>{t.inquiry.delete}</ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
