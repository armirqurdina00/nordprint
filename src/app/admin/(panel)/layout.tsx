import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/db";
import AdminChrome from "@/components/admin/AdminChrome";
import StorageWarning from "@/components/admin/StorageWarning";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { inquiries, settings } = await getContent();
  const newCount = inquiries.filter((i) => i.status === "ny").length;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[256px_1fr]">
      <AdminChrome newCount={newCount} logo={settings.logo} />
      <main className="mx-auto w-full min-w-0 max-w-5xl px-5 py-8 md:px-10 md:py-12">
        <StorageWarning />
        {children}
      </main>
    </div>
  );
}
