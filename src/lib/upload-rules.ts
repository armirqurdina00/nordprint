/** Upload rules shared by the browser (pre-checks, direct uploads) and the server (validation). */

export type UploadKind = "products" | "inquiries" | "site" | "chat";

/**
 * How the browser uploads to Vercel Blob:
 * - "token": classic stores with BLOB_READ_WRITE_TOKEN (client tokens via handleUpload)
 * - "oidc": stores connected with OIDC (BLOB_STORE_ID), which use presigned URLs instead
 * - null: no Blob, files are posted with the form (local development)
 */
export type BlobMode = "token" | "oidc" | null;

const IMAGE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};
const MODEL: Record<string, string> = {
  ".stl": "model/stl",
  ".3mf": "model/3mf",
  ".obj": "model/obj",
  ".step": "model/step",
  ".stp": "model/step",
  ".pdf": "application/pdf",
};

export const RULES: Record<UploadKind, { types: Record<string, string>; maxMb: number }> = {
  products: { types: IMAGE, maxMb: 10 },
  inquiries: { types: { ...IMAGE, ...MODEL }, maxMb: 20 },
  site: { types: { ...IMAGE, ".svg": "image/svg+xml" }, maxMb: 2 },
  chat: { types: { ...IMAGE, ...MODEL }, maxMb: 20 },
};

/** Kinds anyone may upload (rate limited); the rest need an admin session. */
export const PUBLIC_KINDS: UploadKind[] = ["inquiries", "chat"];

export const MAX_INQUIRY_FILES = 5;
export const MAX_CHAT_FILES = 4;
export const MAX_CHAT_TEXT = 2000;

export class UploadError extends Error {
  constructor(public kind: "type" | "size" | "failed" | "storage", public detail: string, public mb = 0) {
    super(
      kind === "type"
        ? `Filtypen ${detail} stöds inte.`
        : kind === "size"
          ? `${detail} är större än ${mb} MB.`
          : kind === "storage"
            ? "Filen kunde inte sparas eftersom Vercel Blob inte är kopplat. Lägg till Blob under Storage i Vercel-projektet och gör en ny deploy."
            : `Uppladdningen av ${detail} misslyckades.`
    );
  }
}

export function extOf(name: string) {
  const m = /\.[a-z0-9]+$/i.exec(name);
  return m ? m[0].toLowerCase() : "";
}

export function baseName(name: string) {
  const ext = extOf(name);
  return (
    name
      .slice(0, name.length - ext.length)
      .normalize("NFKD")
      .replace(/[^\w-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40)
      .replace(/^-|-$/g, "") || "fil"
  );
}

/** Throws UploadError if the file is not allowed for this kind of upload. Returns its extension and media type. */
export function checkFile(file: { name: string; size: number }, kind: UploadKind) {
  const ext = extOf(file.name);
  const contentType = RULES[kind].types[ext];
  if (!contentType) throw new UploadError("type", ext || "(?)");
  if (file.size > RULES[kind].maxMb * 1024 * 1024) throw new UploadError("size", file.name, RULES[kind].maxMb);
  return { ext, contentType };
}

/** True for a file in our Vercel Blob store under the given folder. */
export function isBlobUrl(url: string, kind?: UploadKind) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com") && (!kind || u.pathname.startsWith(`/${kind}/`));
  } catch {
    return false;
  }
}

/** Pathname for a presigned upload: the random part is added here, since presigned tokens are scoped to an exact path. */
export function presignedPathname(kind: UploadKind, name: string, random: string) {
  return `${kind}/${baseName(name)}-${random}${extOf(name)}`;
}

export function isPresignedPathname(pathname: string, kind: UploadKind) {
  return new RegExp(`^${kind}/[\\w-]{1,40}-[a-f0-9]{32}\\.[a-z0-9]+$`).test(pathname);
}
