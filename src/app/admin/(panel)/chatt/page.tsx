import { chatSummary, getConversation, getMessages, listConversations, markSeen } from "@/lib/chat";
import { getContent } from "@/lib/db";
import { getAdminT } from "@/lib/admin-lang";
import { blobMode } from "@/lib/uploads";
import ChatInbox from "@/components/admin/ChatInbox";

export const metadata = { title: "Chatt | Admin" };

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const t = await getAdminT();

  let selected = null;
  const conversation = c ? await getConversation(c) : null;
  if (conversation) {
    if (conversation.unreadAdmin > 0) {
      await markSeen(conversation.id, "admin");
      conversation.unreadAdmin = 0;
      conversation.adminSeenAt = new Date().toISOString();
    }
    selected = { conversation, messages: await getMessages(conversation.id) };
  }

  const [conversations, summary, { products }] = await Promise.all([listConversations(), chatSummary(), getContent()]);
  // show product names instead of paths for "started on"
  const pages: Record<string, string> = {};
  for (const p of products) {
    pages[`/produkter/${p.slug}`] = p.sv.name;
    pages[`/en/products/${p.slug}`] = p.en.name || p.sv.name;
  }

  return (
    <>
      <h1 className={`font-sans text-3xl font-semibold tracking-normal ${selected ? "max-lg:hidden" : ""}`}>{t.chat.title}</h1>
      <ChatInbox
        conversations={conversations}
        rev={summary.rev}
        selected={selected}
        missing={!!c && !conversation}
        direct={blobMode}
        pages={pages}
      />
    </>
  );
}
