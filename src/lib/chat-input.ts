import "server-only";
import { collectUploads, UploadError } from "./uploads";
import { MAX_CHAT_FILES, MAX_CHAT_TEXT } from "./upload-rules";

/** Error codes the chat endpoints return; the browser turns them into text in the right language. */
export type ChatErrorCode = "empty" | "long" | "email" | "rate" | "file" | "unavailable" | "gone" | "forbidden";
export type ChatError = { error: ChatErrorCode; kind?: UploadError["kind"]; detail?: string; mb?: number };

/** Reads the text and attachments of a new message from a multipart request. */
export async function readMessage(form: FormData): Promise<{ text: string; files: string[] } | ChatError> {
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
  return { text, files };
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
