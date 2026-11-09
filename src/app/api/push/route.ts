import { rateLimit } from "@/lib/db";
import { getConversation } from "@/lib/chat";
import { clientIp, json, sameOrigin, visitorChatId } from "@/lib/chat-session";
import { pushPublicKey, readSubscription, removeChatSubscription, saveChatSubscription } from "@/lib/push";

/** This browser wants a notification when the studio replies in its conversation. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  if (!pushPublicKey) return json({ error: "unavailable" }, 503);
  if (!(await rateLimit(`push:${clientIp(req)}`, 60, 3600))) return json({ error: "rate" }, 429);
  const id = await visitorChatId();
  const conversation = id ? await getConversation(id) : null;
  if (!conversation) return json({ error: "gone" }, 404);
  const sub = readSubscription(await req.json().catch(() => null), conversation.lang);
  if (!sub) return json({ error: "invalid" }, 400);
  await saveChatSubscription(conversation.id, sub);
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const id = await visitorChatId();
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: unknown };
  if (id && typeof endpoint === "string") await removeChatSubscription(id, endpoint);
  return json({ ok: true });
}
