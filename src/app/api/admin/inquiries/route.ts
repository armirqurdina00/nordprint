import { isAdmin } from "@/lib/auth";
import { getContent, inquirySummary } from "@/lib/db";
import { json } from "@/lib/chat-session";

/** Polled by the admin panel so new requests show up without reloading. */
export async function GET() {
  if (!(await isAdmin())) return json({ error: "forbidden" }, 401);
  return json(inquirySummary((await getContent()).inquiries));
}
