export function formatPrice(sek: number, lang: "sv" | "en" = "sv") {
  return new Intl.NumberFormat(lang === "en" ? "en-SE" : "sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(sek);
}

export function formatDate(iso: string, locale = "sv-SE") {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/å|ä/g, "a")
    .replace(/ö/g, "o")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/** Direct-message link (ig.me opens the DM in the app or on the web) for an Instagram profile URL. */
export function instagramDm(profileUrl: string) {
  const m = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(profileUrl);
  return m && !["p", "reel", "stories"].includes(m[1]) ? `https://ig.me/m/${m[1]}` : profileUrl;
}
