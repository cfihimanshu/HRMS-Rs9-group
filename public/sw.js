const CACHE_NAME = "rs9-hrms-shell-v2";
const APP_SHELL = ["/login", "/offline.html", "/icons/rs9-hrms-192.png", "/icons/rs9-hrms-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.url.includes("/api/") || request.url.includes("/api/auth/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});

self.addEventListener("push", event => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch (_) {
    payload = { body: event.data?.text() || "You have a new update." };
  }
  event.waitUntil(self.registration.showNotification(payload.title || "Rs9 HRMS", {
    body: payload.body || "You have a new update.",
    icon: "/icons/rs9-hrms-192.png",
    badge: "/icons/rs9-hrms-192.png",
    data: { url: payload.url || "/dashboard" },
    tag: payload.tag || "rs9-notification",
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      existing.navigate(target);
      return existing.focus();
    }
    return clients.openWindow(target);
  }));
});
