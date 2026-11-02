import { promises as fs } from "fs";
import path from "path";
import { UPLOAD_DIR, MIME } from "@/lib/uploads";
import { isAdmin } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const target = path.resolve(UPLOAD_DIR, ...parts);
  if (!target.startsWith(UPLOAD_DIR + path.sep)) return new Response("Not found", { status: 404 });
  // customer attachments are private
  if (parts[0] === "inquiries" && !(await isAdmin())) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(target);
    const ext = path.extname(target).toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": parts[0] === "inquiries" ? "private, no-store" : "public, max-age=31536000, immutable",
        ...(MIME[ext] ? {} : { "Content-Disposition": `attachment; filename="${path.basename(target)}"` }),
        "X-Content-Type-Options": "nosniff",
        // uploaded files are data, never documents that may run scripts (matters for SVG)
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
