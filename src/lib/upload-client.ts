import { upload } from "@vercel/blob/client";
import { baseName, checkFile, UploadError, type UploadKind } from "./upload-rules";

/**
 * Browser side of direct uploads: checks every file first, then uploads them to Vercel Blob
 * and replaces the files in the form with their URLs (field `${field}__urls`).
 */
export async function moveFilesToBlob(form: FormData, field: string, kind: UploadKind, max = 20) {
  const files = form
    .getAll(field)
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, max);
  form.delete(field);
  const checked = files.map((f) => ({ file: f, ...checkFile(f, kind) }));
  const urls = await Promise.all(
    checked.map(async ({ file, ext, contentType }) => {
      try {
        const res = await upload(`${kind}/${baseName(file.name)}${ext}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: kind,
          contentType,
          multipart: file.size > 8 * 1024 * 1024,
        });
        return res.url;
      } catch {
        throw new UploadError("failed", file.name);
      }
    })
  );
  form.set(`${field}__urls`, JSON.stringify(urls));
}
