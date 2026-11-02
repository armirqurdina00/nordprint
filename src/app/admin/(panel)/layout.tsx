import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/db";
import AdminNav from "@/components/admin/AdminNav";
import Logo from "@/components/site/Logo";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { inquiries, settings } = await getContent();
  const newCount = inquiries.filter((i) => i.status === "ny").length;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-granite p-4 text-snow md:sticky md:top-0 md:flex md:h-screen md:flex-col md:p-5">
        <div className="mb-4 flex items-center justify-between md:mb-8 md:block">
          <Logo src={settings.logo} className={settings.logo ? "rounded bg-white p-1" : ""} />
        </div>
        <AdminNav newCount={newCount} />
        <div className="mt-4 flex gap-4 text-sm text-mist md:mt-auto md:flex-col md:gap-2">
          <Link href="/" target="_blank" className="hover:text-white">Visa webbplatsen</Link>
          <form action={logout}><button className="hover:text-white">Logga ut</button></form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
