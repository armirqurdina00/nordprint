"use client";

import { useCallback, useEffect, useState } from "react";
import { request } from "./chat-client";

/**
 * loading      not known yet (first render)
 * unsupported  this browser has no web push, or the server has no keys
 * install      iPhone/iPad in Safari: push only works from the Home Screen app
 * denied       blocked in the browser settings
 */
export type PushState = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

export const registerServiceWorker = () => navigator.serviceWorker.register("/sw.js");

function environment(publicKey: string): PushState | null {
  if (!publicKey) return "unsupported";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return null;
}

function decodeKey(base64url: string) {
  const raw = atob(base64url.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

async function subscribe(publicKey: string) {
  await registerServiceWorker();
  const { pushManager } = await navigator.serviceWorker.ready;
  const key = decodeKey(publicKey);
  const current = await pushManager.getSubscription();
  if (current) {
    const used = current.options.applicationServerKey;
    if (used && sameBytes(new Uint8Array(used), key)) return current;
    // the server's keys were replaced: this subscription can no longer be used
    await current.unsubscribe();
  }
  return pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}

const postJson = (url: string, method: string, body: unknown) =>
  request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/**
 * The notification switch.
 * `ready` is false while there is nothing to subscribe to yet (a visitor without a conversation). When it
 * turns true on a browser that already opted in, the subscription is sent again, which also links it to a new
 * conversation and replaces one the browser has renewed.
 */
export function usePush({ url, publicKey, flag, ready = true }: { url: string; publicKey: string; flag: string; ready?: boolean }) {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const blocked = environment(publicKey);
    if (blocked) return setState(blocked);
    if (Notification.permission === "denied") return setState("denied");
    if (Notification.permission !== "granted" || localStorage.getItem(flag) !== "1") return setState("off");
    setState("on");
    if (ready) subscribe(publicKey).then((sub) => postJson(url, "POST", sub)).catch((e) => console.warn("[push] could not renew", e));
  }, [url, publicKey, flag, ready]);

  const enable = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      await postJson(url, "POST", await subscribe(publicKey));
      localStorage.setItem(flag, "1");
      setState("on");
    } catch (e) {
      console.error("[push] could not turn on", e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [url, publicKey, flag]);

  const disable = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    localStorage.removeItem(flag);
    setState("off");
    try {
      const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
      if (sub) {
        await postJson(url, "DELETE", { endpoint: sub.endpoint }).catch(() => undefined);
        await sub.unsubscribe();
      }
    } catch (e) {
      console.warn("[push] could not turn off", e);
    } finally {
      setBusy(false);
    }
  }, [url, flag]);

  return { state, busy, failed, enable, disable };
}
