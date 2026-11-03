import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getContent, inquirySummary } from "@/lib/db";
import { getAdminLang } from "@/lib/admin-lang";
import AdminChrome from "@/components/admin/AdminChrome";
import StorageWarning from "@/components/admin/StorageWarning";
import { AdminI18nProvider } from "@/components/admin/AdminI18n";
import { ChatLiveProvider } from "@/components/admin/ChatLive";
import { InquiryLiveProvider } from "@/components/admin/InquiryLive";
import { chatSummary } from "@/lib/chat";

export const metadata: Metadata = { title: "Admin | NordPrint Studio", robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [{ inquiries, settings }, lang, chat] = await Promise.all([getContent(), getAdminLang(), chatSummary()]);
  return (
    <AdminI18nProvider lang={lang}>
      <InquiryLiveProvider initial={inquirySummary(inquiries)}>
      <ChatLiveProvider initial={chat}>
        <div className="min-h-screen md:grid md:grid-cols-[256px_1fr]">
          <AdminChrome logo={settings.logo} />
          <main className="mx-auto w-full min-w-0 max-w-5xl px-5 py-8 md:px-10 md:py-12">
            <StorageWarning />
            {children}
          </main>
        </div>
      </ChatLiveProvider>
      </InquiryLiveProvider>
    </AdminI18nProvider>
  );
}
