"use server";

import { revalidatePath } from "next/cache";
import { mutate, newId } from "@/lib/db";
import { collectUploads, UploadError } from "@/lib/uploads";
import { MAX_INQUIRY_FILES } from "@/lib/upload-rules";
import { isLang, t } from "@/lib/i18n";

export type InquiryState = { ok: boolean; error?: string; fields?: Record<string, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const lang = isLang(get("lang")) ? (get("lang") as "sv" | "en") : "sv";
  const d = t(lang).order;
  const fields = {
    name: get("name"),
    email: get("email"),
    phone: get("phone"),
    productSlug: get("productSlug"),
    quantity: get("quantity"),
    color: get("color").slice(0, 80),
    message: get("message"),
  };

  // honeypot for bots
  if (get("website")) return { ok: true };

  if (!fields.name) return { ok: false, error: d.errName, fields };
  if (!EMAIL.test(fields.email)) return { ok: false, error: d.errEmail, fields };
  if (fields.message.length < 5) return { ok: false, error: d.errMessage, fields };
  if (fields.message.length > 5000) return { ok: false, error: d.errLong, fields };

  let saved: string[];
  try {
    saved = await collectUploads(form, "files", "inquiries", MAX_INQUIRY_FILES);
  } catch (e) {
    console.error("[order] attachments could not be saved:", e);
    if (e instanceof UploadError) {
      return { ok: false, error: e.kind === "type" ? d.errFileType(e.detail) : e.kind === "size" ? d.errFileSize(e.detail, e.mb) : d.errUpload(e.detail), fields };
    }
    throw e;
  }

  // the owner reads inquiries in Swedish, so the colour line is always Swedish
  const message = fields.color ? `${fields.message}\n\nÖnskad färg: ${fields.color}` : fields.message;

  await mutate((data) => {
    data.inquiries.unshift({
      id: newId(),
      createdAt: new Date().toISOString(),
      lang,
      name: fields.name.slice(0, 120),
      email: fields.email.slice(0, 200),
      phone: fields.phone.slice(0, 40),
      productSlug: fields.productSlug,
      quantity: fields.quantity.slice(0, 20),
      message,
      files: saved,
      status: "ny",
      notes: "",
    });
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
