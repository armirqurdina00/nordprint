import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/db";
import { RULES, extOf, type UploadKind } from "@/lib/upload-rules";

/** Issues short-lived tokens so the browser can upload straight to Vercel Blob. */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = clientPayload as UploadKind;
        if (!(kind in RULES)) throw new Error("Unknown upload type");
        if (!pathname.startsWith(`${kind}/`)) throw new Error("Invalid path");
        if (!RULES[kind].types[extOf(pathname)]) throw new Error("File type not allowed");
        if (kind !== "inquiries" && !(await isAdmin())) throw new Error("Not authorised");
        if (kind === "inquiries") {
          const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
          if (!(await rateLimit(`upload:${ip}`, 30, 3600))) throw new Error("Too many uploads, try again later");
        }
        return {
          allowedContentTypes: [...new Set(Object.values(RULES[kind].types))],
          maximumSizeInBytes: RULES[kind].maxMb * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
