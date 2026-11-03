import "server-only";
import { collectUploads, UploadError } from "./uploads";
import { MAX_CHAT_FILES, MAX_CHAT_TEXT } from "./upload-rules";
import { getProductBySlug } from "./db";
import { localProduct } from "./localize";
import type { ChatProductRef, Lang } from "./types";

/** Error codes the chat endpoints return; the browser turns them into text in the right language. */
export type ChatErrorCode = "empty" | "long" | "email" | "rate" | "file" | "unavailable" | "gone" | "forbidden";
export type ChatError = { error: ChatErrorCode; kind?: UploadError["kind"]; detail?: string; mb?: number };

/** Reads the text and attachments of a new message from a multipart request. */
export async function readMessage(form: FormData, productLang?: Lang): Promise<{ text: string; files: string[]; product?: ChatProductRef } | ChatError> {
  const text = String(form.get("text") ?? "").replace(/\r\n/g, "\n").trim();
  if (text.length > MAX_CHAT_TEXT) return { error: "long" };
  let files: string[];
  try {
    files = await collectUploads(form, "files", "chat", MAX_CHAT_FILES);
  } catch (e) {
    if (e instanceof UploadError) {
      console.error("[chat] attachment could not be saved:", e.message);
      return { error: "file", kind: e.kind, detail: e.detail, mb: e.mb };
    }
    throw e;
  }
  if (!text && files.length === 0) return { error: "empty" };
  // only a slug comes from the browser; name and photo are looked up here so they cannot be made up
  let product: ChatProductRef | undefined;
  const slug = String(form.get("product") ?? "");
  if (productLang && slug) {
    const p = await getProductBySlug(slug);
    if (p) {
      const lp = localProduct(p, productLang);
      product = { slug: p.slug, name: lp.name, image: lp.images[0] ?? "" };
    }
  }
  return { text, files, product };
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
