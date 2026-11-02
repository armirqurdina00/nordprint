import { NextResponse, type NextRequest } from "next/server";
import { INTERNAL_TO_SV, SV_TO_INTERNAL } from "@/lib/routes";

export const config = {
  matcher: ["/((?!_next|admin|uploads|images|api|favicon|.*\\.[\\w]+$).*)"],
};

function withLang(req: NextRequest, lang: string, rewriteTo?: string) {
  const headers = new Headers(req.headers);
  headers.set("x-lang", lang);
  if (rewriteTo) {
    const url = req.nextUrl.clone();
    url.pathname = rewriteTo;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

function prefersEnglish(req: NextRequest) {
  const header = req.headers.get("accept-language") ?? "";
  const first = header.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return first !== "" && !["sv", "da", "no", "nb", "nn"].includes(first);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const parts = pathname.split("/").filter(Boolean);

  // English: /en/... maps 1:1 onto the internal [lang] routes
  if (parts[0] === "en") return withLang(req, "en");

  // /sv/... is never a public URL: send it to the clean Swedish address
  if (parts[0] === "sv") {
    const url = req.nextUrl.clone();
    const rest = parts.slice(1);
    if (rest[0]) rest[0] = INTERNAL_TO_SV[rest[0]] ?? rest[0];
    url.pathname = "/" + rest.join("/");
    return NextResponse.redirect(url, 308);
  }

  // first visit to the start page with a non-Nordic browser language: offer English
  if (parts.length === 0 && !req.cookies.get("np_lang") && prefersEnglish(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/en";
    return NextResponse.redirect(url);
  }

  const internal = parts.length ? [SV_TO_INTERNAL[parts[0]] ?? `_${parts[0]}`, ...parts.slice(1)] : [];
  return withLang(req, "sv", "/" + ["sv", ...internal].join("/"));
}
