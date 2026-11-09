"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push-client";

export default function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) registerServiceWorker().catch((e) => console.warn("[pwa] service worker", e));
  }, []);
  return null;
}
