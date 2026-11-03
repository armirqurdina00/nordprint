import { rateLimit } from "@/lib/db";
import { addMessage, chatEnabled, createConversation, getConversation, getMessages, markSeen, updateConversation } from "@/lib/chat";
import { clearVisitorChat, clientIp, json, sameOrigin, setVisitorChat, visitorChatId } from "@/lib/chat-session";
import { EMAIL, readMessage, type ChatError } from "@/lib/chat-input";
import { isLang } from "@/lib/i18n";
import type { Conversation } from "@/lib/types";

/** What the visitor may see about their own conversation. */
function view(c: Conversation) {
  return { status: c.status, name: c.name, email: c.email, adminSeenAt: c.adminSeenAt, unread: c.unreadVisitor };
}

const err = (e: ChatError, status = 400) => json(e, status);

/** The visitor's conversation: messages after `after`; `seen=1` when the chat window is open. */
export async function GET(req: Request) {
  if (!chatEnabled) return json({ conversation: null });
  const id = await visitorChatId();
  if (!id) return json({ conversation: null });
  const conversation = await getConversation(id);
  if (!conversation) {
    // deleted by the studio
    await clearVisitorChat();
    return json({ conversation: null });
  }
  const url = new URL(req.url);
  const messages = await getMessages(id, Number(url.searchParams.get("after")) || 0);
  if (url.searchParams.get("seen") === "1" && conversation.unreadVisitor > 0) {
    await markSeen(id, "visitor");
    conversation.unreadVisitor = 0;
  }
  return json({ conversation: view(conversation), messages });
}

/** Sends a message; starts a conversation first if this browser has none. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return err({ error: "forbidden" }, 403);
  if (!chatEnabled) return err({ error: "unavailable" }, 503);
  const ip = clientIp(req);
  if (!(await rateLimit(`chat:${ip}`, 40, 600))) return err({ error: "rate" }, 429);

  const form = await req.formData();
  // honeypot for bots: pretend it worked
  if (String(form.get("website") ?? "")) return json({ message: null });

  const input = await readMessage(form);
  if ("error" in input) return err(input);

  let id = await visitorChatId();
  let conversation = id ? await getConversation(id) : null;
  if (!conversation) {
    if (!(await rateLimit(`chat-new:${ip}`, 6, 3600))) return err({ error: "rate" }, 429);
    const lang = String(form.get("lang") ?? "");
    const page = String(form.get("page") ?? "");
    conversation = await createConversation({
      lang: isLang(lang) ? lang : "sv",
      name: "",
      email: "",
      page: page.startsWith("/") ? page.slice(0, 200) : "",
    });
    id = conversation.id;
    await setVisitorChat(id);
  }
  const message = await addMessage(conversation.id, "visitor", input.text, input.files);
  return json({ message, conversation: view({ ...conversation, status: "open" }) });
}

/** The visitor leaves their name and e-mail address so the studio can answer by e-mail. */
export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return err({ error: "forbidden" }, 403);
  const id = await visitorChatId();
  const conversation = id ? await getConversation(id) : null;
  if (!conversation) return err({ error: "gone" }, 404);
  const body = (await req.json().catch(() => ({}))) as { name?: unknown; email?: unknown };
  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().slice(0, 200);
  if (email && !EMAIL.test(email)) return err({ error: "email" });
  await updateConversation(conversation.id, { name, email });
  return json({ conversation: view({ ...conversation, name, email }) });
}

/** Ends the chat in this browser. The studio keeps the conversation. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return err({ error: "forbidden" }, 403);
  await clearVisitorChat();
  return json({ ok: true });
}
