"use client";

import { useEffect } from "react";

/**
 * Adds `is-in` to every `[data-reveal]` element once it scrolls into view (see globals.css).
 * Also picks up elements added later, e.g. after client-side navigation.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    const scan = (root: ParentNode) => root.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    document.documentElement.classList.add("reveal-ready");
    scan(document);
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof Element && (n.matches("[data-reveal]") ? io.observe(n) : scan(n)));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
