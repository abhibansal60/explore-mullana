// Offline cache. Bump V to drop old caches.
const V = "mullana-v3";
// Cached on install, with the CSS and JS they use, so they work offline from the first visit.
const PRECACHE = ["/", "/helplines/"];

const put = (req, res) => res.ok && caches.open(V).then((c) => c.put(req, res.clone()));

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(V)
      .then(async (c) => {
        for (const path of PRECACHE) {
          const res = await fetch(path);
          if (!res.ok) continue;
          const html = await res.clone().text();
          await c.put(path, res);
          const assets = [...new Set(html.match(/\/_astro\/[^"'\s)]+/g) ?? [])];
          await c.addAll(assets).catch(() => {});
        }
      })
      .then(() => self.skipWaiting()),
  );
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

  if (url.origin !== location.origin) return; // tiles, weather: straight to network

  if (req.mode === "navigate") {
    // Network first, but on 4G that hangs, fall back to the saved copy after 4 seconds.
    const net = fetch(req).then((res) => (put(req, res), res));
    const saved = () => caches.match(req).then((hit) => hit || caches.match("/"));
    const slow = new Promise((ok) => setTimeout(ok, 4000)).then(() => caches.match(req)).then((hit) => hit || net);
    e.respondWith(Promise.race([net, slow]).catch(saved));
  } else if (url.pathname.startsWith("/_astro/")) {
    // ponytail: old hashed files pile up across deploys; bump V to clear them if the cache ever gets big.
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => (put(req, res), res))));
  }
  // everything else (/api/, /buildings.geojson, ...) is not intercepted
});
