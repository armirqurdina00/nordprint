import { isAdmin } from "@/lib/auth";
import { chatSummary, listConversations } from "@/lib/chat";
import { json } from "@/lib/chat-session";

/**
 * Inbox polling. Always returns `rev` and `unread`; the list itself only when `list=1`
 * and the inbox changed since the `rev` the browser already has.
 */
export async function GET(req: Request) {
  if (!(await isAdmin())) return json({ error: "forbidden" }, 401);
  const url = new URL(req.url);
  const summary = await chatSummary();
  const known = url.searchParams.get("rev");
  if (url.searchParams.get("list") !== "1" || (known !== null && Number(known) === summary.rev)) return json(summary);
  return json({ ...summary, conversations: await listConversations() });
}
