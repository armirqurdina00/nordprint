import { upload, uploadPresigned } from "@vercel/blob/client";
import { baseName, checkFile, presignedPathname, UploadError, type BlobMode, type UploadKind } from "./upload-rules";

/**
 * Browser side of direct uploads: checks every file first, then uploads them to Vercel Blob
 * and replaces the files in the form with their URLs (field `${field}__urls`).
 */
export async function moveFilesToBlob(form: FormData, field: string, kind: UploadKind, mode: BlobMode, max = 20) {
  const files = form
    .getAll(field)
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, max);
  form.delete(field);
  const checked = files.map((f) => ({ file: f, ...checkFile(f, kind) }));
  const urls = await Promise.all(
    checked.map(async ({ file, ext, contentType }) => {
      try {
        const options = {
          access: "public" as const,
          handleUploadUrl: "/api/upload",
          clientPayload: kind,
          contentType,
          multipart: file.size > 8 * 1024 * 1024,
        };
        const res =
          mode === "oidc"
            ? await uploadPresigned(presignedPathname(kind, file.name, crypto.randomUUID().replace(/-/g, "")), file, options)
            : await upload(`${kind}/${baseName(file.name)}${ext}`, file, options);
        if (!res?.url) throw new Error("Upload finished without a file URL");
        return res.url;
      } catch (e) {
        console.error(`[upload] ${file.name} failed:`, e);
        throw new UploadError("failed", file.name);
      }
    })
  );
  form.set(`${field}__urls`, JSON.stringify(urls));
}
