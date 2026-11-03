import { issueSignedToken } from "@vercel/blob";
import { handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/db";
import { PUBLIC_KINDS, RULES, extOf, isPresignedPathname, type UploadKind } from "@/lib/upload-rules";

/** Checks who may upload what, and returns the limits for the upload. */
async function authorise(request: Request, pathname: string, clientPayload: string | null, presigned: boolean) {
  const kind = clientPayload as UploadKind;
  if (!(kind in RULES)) throw new Error("Unknown upload type");
  if (presigned ? !isPresignedPathname(pathname, kind) : !pathname.startsWith(`${kind}/`)) throw new Error("Invalid path");
  if (!RULES[kind].types[extOf(pathname)]) throw new Error("File type not allowed");
  const isPublic = PUBLIC_KINDS.includes(kind);
  if (!isPublic && !(await isAdmin())) throw new Error("Not authorised");
  if (isPublic && !(await isAdmin())) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await rateLimit(`upload:${ip}`, 30, 3600))) throw new Error("Too many uploads, try again later");
  }
  return {
    allowedContentTypes: [...new Set(Object.values(RULES[kind].types))],
    maximumSizeInBytes: RULES[kind].maxMb * 1024 * 1024,
  };
}

/**
 * Lets the browser upload straight to Vercel Blob.
 * Classic stores (BLOB_READ_WRITE_TOKEN) get a client token; stores connected with OIDC
 * (BLOB_STORE_ID, the Vercel default) get a presigned URL scoped to one exact pathname.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody | HandleUploadPresignedBody;
  try {
    if (body.type === "blob.generate-presigned-url") {
      const result = await handleUploadPresigned({
        body,
        request,
        // only used to verify upload-completed callbacks, which this app does not request
        webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY || "unused",
        getSignedToken: async (pathname, clientPayload) => {
          const limits = await authorise(request, pathname, clientPayload, true);
          const token = await issueSignedToken({
            pathname,
            operations: ["put"],
            validUntil: Date.now() + 10 * 60 * 1000,
            ...limits,
          });
          return { token, urlOptions: { ...limits, allowOverwrite: false } };
        },
      });
      return Response.json(result);
    }
    const result = await handleUpload({
      body: body as HandleUploadBody,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => ({
        ...(await authorise(request, pathname, clientPayload, false)),
        addRandomSuffix: true,
      }),
    });
    return Response.json(result);
  } catch (e) {
    console.error("[upload] token request refused or failed:", (e as Error).message);
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
