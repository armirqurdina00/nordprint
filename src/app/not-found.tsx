import Link from "next/link";
import { headers } from "next/headers";
import { t } from "@/lib/i18n";
import { href } from "@/lib/routes";

export default async function NotFound() {
  const lang = (await headers()).get("x-lang") === "en" ? "en" : "sv";
  const d = t(lang).notFound;
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-xl place-content-center px-5 text-center">
      <h1 className="text-4xl font-semibold">{d.title}</h1>
      <p className="mt-3 text-fjord">{d.text}</p>
      <Link href={href(lang, "products")} className="btn btn-primary mx-auto mt-8">{d.cta}</Link>
    </main>
  );
}
