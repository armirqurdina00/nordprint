import "server-only";
import { cookies } from "next/headers";
import { signValue, verifySigned } from "./auth";
import { isChatId } from "./chat";

/** httpOnly, signed: which conversation belongs to this browser. */
const CHAT_COOKIE = "np_chat";
/** readable by the widget, only says "there is a conversation" so it knows whether to check for replies */
export const CHAT_FLAG = "np_chat_on";
const MAX_AGE = 60 * 60 * 24 * 90;

export async function visitorChatId() {
  const id = verifySigned((await cookies()).get(CHAT_COOKIE)?.value);
  return isChatId(id) ? id : null;
}

export async function setVisitorChat(id: string) {
  const jar = await cookies();
  const base = { sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE };
  jar.set(CHAT_COOKIE, signValue(id), { ...base, httpOnly: true });
  jar.set(CHAT_FLAG, "1", base);
}

export async function clearVisitorChat() {
  const jar = await cookies();
  jar.delete(CHAT_COOKIE);
  jar.delete(CHAT_FLAG);
}

/** Rejects cross-site requests that change data (on top of the SameSite cookies). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export const noStore = { "Cache-Control": "private, no-store" };

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStore });
}
