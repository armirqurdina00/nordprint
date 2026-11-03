import { isAdmin } from "@/lib/auth";
import { addMessage, deleteConversation, getConversation, getMessages, markSeen, updateConversation } from "@/lib/chat";
import { json, sameOrigin } from "@/lib/chat-session";
import { readMessage } from "@/lib/chat-input";
import { deleteUpload } from "@/lib/uploads";

type Ctx = { params: Promise<{ id: string }> };

async function load(req: Request, ctx: Ctx, write: boolean) {
  if (write && !sameOrigin(req)) return { res: json({ error: "forbidden" }, 403) };
  if (!(await isAdmin())) return { res: json({ error: "forbidden" }, 401) };
  const conversation = await getConversation((await ctx.params).id);
  if (!conversation) return { res: json({ error: "gone" }, 404) };
  return { conversation };
}

/** Messages after `after`; `seen=1` while the admin has the conversation open. */
export async function GET(req: Request, ctx: Ctx) {
  const { res, conversation } = await load(req, ctx, false);
  if (res) return res;
  const url = new URL(req.url);
  const messages = await getMessages(conversation.id, Number(url.searchParams.get("after")) || 0);
  if (url.searchParams.get("seen") === "1" && conversation.unreadAdmin > 0) {
    await markSeen(conversation.id, "admin");
    conversation.unreadAdmin = 0;
  }
  return json({ conversation, messages });
}

/** Reply from the studio. */
export async function POST(req: Request, ctx: Ctx) {
  const { res, conversation } = await load(req, ctx, true);
  if (res) return res;
  const input = await readMessage(await req.formData());
  if ("error" in input) return json(input, 400);
  const message = await addMessage(conversation.id, "admin", input.text, input.files);
  // replying means the admin has read everything before it
  if (conversation.unreadAdmin > 0) await markSeen(conversation.id, "admin");
  return json({ message });
}

/** Close or reopen. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { res, conversation } = await load(req, ctx, true);
  if (res) return res;
  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  if (body.status !== "open" && body.status !== "closed") return json({ error: "forbidden" }, 400);
  await updateConversation(conversation.id, { status: body.status });
  return json({ conversation: { ...conversation, status: body.status } });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { res, conversation } = await load(req, ctx, true);
  if (res) return res;
  const files = await deleteConversation(conversation.id);
  await Promise.all(files.map(deleteUpload));
  return json({ ok: true });
}
