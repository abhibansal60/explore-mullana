// Offline cache. Bump V to drop old caches.
const V = "mullana-v1";
const FONTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

const put = (req, res) => res.ok && caches.open(V).then((c) => c.put(req, res.clone()));

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.add("/")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request: req } = e;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (FONTS.includes(url.hostname)) {
    // Stale-while-revalidate. Fonts are CORS, so responses are not opaque.
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => (put(req, res), res));
        return hit || net;
      }),
    );
    return;
  }
  if (url.origin !== location.origin) return; // tiles etc: straight to network

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => (put(req, res), res)).catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
  } else if (url.pathname.startsWith("/_astro/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => (put(req, res), res))));
  }
  // everything else (/api/, /buildings.geojson, ...) is not intercepted
});
