// sw.js — cache app-shell ringan (strategi: precache + cache-first aset,
// network-first navigasi dengan fallback offline)
const V = "srisp-v1";
const CORE = [
  "/", "/index.html", "/css/style.css",
  "/js/app.js", "/js/config.js", "/js/ui.js", "/js/ui-helpers.js",
  "/js/firebase.js", "/js/store.js", "/js/router-shim.js",
  "/js/panels/home.js", "/js/panels/booking.js", "/js/panels/courts.js",
  "/js/panels/tournament.js", "/js/panels/history.js", "/js/panels/admin.js",
  "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png",
  "/icons/maskable-512.png", "/icons/apple-touch.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/__") || url.pathname.startsWith("/manus-")) return;

  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(V).then((c) => c.put("/index.html", copy));
          return r;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request).then((r) => {
        if (r.ok && (url.origin === location.origin || url.hostname.endsWith("gstatic.com"))) {
          const copy = r.clone();
          caches.open(V).then((c) => c.put(e.request, copy));
        }
        return r;
      }).catch(() => Response.error())
    )
  );
});
