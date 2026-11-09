/* Push notifications only. Nothing is cached, so the site never shows stale prices or pages. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // always show something: browsers penalise a push that shows no notification
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "NordPrint Studio", {
      body: data.body || "",
      // one notification per conversation; a new message replaces the old one and alerts again
      tag: data.tag,
      renotify: !!data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(open(new URL(event.notification.data?.url || "/", self.location.origin)));
});

/** Reuses a window of the same area (admin or website) if there is one. */
async function open(url) {
  const isAdmin = (path) => path === "/admin" || path.startsWith("/admin/");
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const client = windows.find((c) => isAdmin(new URL(c.url).pathname) === isAdmin(url.pathname));
  if (client) {
    try {
      await client.focus();
      await client.navigate(url.href);
      return;
    } catch {
      // not allowed to take over this window: open a new one instead
    }
  }
  await self.clients.openWindow(url.href);
}
