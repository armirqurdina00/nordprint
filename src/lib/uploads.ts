import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { del } from "@vercel/blob";
import { baseName, checkFile, isBlobUrl, UploadError, type BlobMode, type UploadKind } from "./upload-rules";

export { UploadError };

/**
 * Two modes:
 * - Vercel (BLOB_READ_WRITE_TOKEN or OIDC-connected BLOB_STORE_ID): the browser uploads straight to Vercel Blob via /api/upload,
 *   and server actions only receive the resulting URLs. This avoids Vercel's 4.5 MB request limit.
 * - Local: files are posted with the form and written to data/uploads, served by /uploads/[...path].
 */
export const blobMode: BlobMode = process.env.BLOB_READ_WRITE_TOKEN ? "token" : process.env.BLOB_STORE_ID ? "oidc" : null;
export const directUploads = blobMode !== null;

/** Deployed on Vercel without Blob: the disk is read-only, so files cannot be stored anywhere. */
export const uploadsUnavailable = !directUploads && !!process.env.VERCEL;

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
};

/** Local mode: saves an uploaded file and returns its URL, or null if empty. */
export async function saveUpload(file: File | null, kind: UploadKind): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const { ext } = checkFile(file, kind);
  if (uploadsUnavailable) throw new UploadError("storage", file.name);
  const dir = path.join(UPLOAD_DIR, kind);
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${baseName(file.name)}${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${kind}/${name}`;
}

/** Collects new files for a form field: Blob URLs uploaded by the browser, or files posted with the form. */
export async function collectUploads(form: FormData, field: string, kind: UploadKind, max = 20): Promise<string[]> {
  if (directUploads) {
    let urls: unknown;
    try {
      urls = JSON.parse(String(form.get(`${field}__urls`) ?? "[]"));
    } catch {
      urls = [];
    }
    const list = Array.isArray(urls) ? urls : [];
    const valid = list.filter((u): u is string => typeof u === "string" && isBlobUrl(u, kind)).slice(0, max);
    if (valid.length !== list.length) console.warn(`[uploads] ignored ${list.length - valid.length} invalid ${kind} URL(s):`, list);
    return valid;
  }
  const out: string[] = [];
  for (const f of form.getAll(field).slice(0, max)) {
    const url = await saveUpload(f instanceof File ? f : null, kind);
    if (url) out.push(url);
  }
  return out;
}

export async function deleteUpload(url: string) {
  if (isBlobUrl(url)) {
    if (directUploads) await del(url).catch(() => undefined);
    return;
  }
  if (!url.startsWith("/uploads/")) return; // files shipped in /public are never deleted
  const target = path.resolve(UPLOAD_DIR, url.replace(/^\/uploads\//, ""));
  if (!target.startsWith(UPLOAD_DIR + path.sep)) return;
  await fs.rm(target, { force: true });
}
