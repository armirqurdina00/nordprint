import { isAdmin } from "@/lib/auth";
import { getAdminLang } from "@/lib/admin-lang";
import { json, sameOrigin } from "@/lib/chat-session";
import { pushPublicKey, readSubscription, removeAdminSubscription, saveAdminSubscription } from "@/lib/push";

/** This device wants a notification when a visitor writes. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  if (!(await isAdmin())) return json({ error: "forbidden" }, 401);
  if (!pushPublicKey) return json({ error: "unavailable" }, 503);
  const sub = readSubscription(await req.json().catch(() => null), await getAdminLang());
  if (!sub) return json({ error: "invalid" }, 400);
  await saveAdminSubscription(sub);
  return json({ ok: true });
}

/** No login needed: the endpoint is known only to its browser, and logging out must be able to remove it. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: unknown };
  if (typeof endpoint === "string") await removeAdminSubscription(endpoint);
  return json({ ok: true });
}
