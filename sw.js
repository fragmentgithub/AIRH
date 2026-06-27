const CACHE_VERSION = "hiragana-asobi-v1-2026-06-27";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/main.js",
  "./src/audio.js",
  "./src/modes.js",
  "./src/timers.js",
  "./assets/icon.svg",
  "./assets/manifest.webmanifest",
  "./assets/audio/manifest.json",
];

async function precache() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(CORE_ASSETS);
  try {
    const response = await fetch("./assets/audio/manifest.json", { cache: "no-store" });
    if (!response.ok) return;
    const manifest = await response.clone().json();
    await cache.put("./assets/audio/manifest.json", response);
    await cache.addAll(Object.values(manifest));
  } catch (_) {}
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);
    const url = new URL(request.url);
    const isCode = request.mode === "navigate" || /\.(?:html|css|js|json)$/i.test(url.pathname);
    if (cached && !isCode) return cached;

    const network = fetch(request).then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);

    if (cached) {
      event.waitUntil(network.then(() => undefined));
      return cached;
    }

    const response = await network;
    if (response) return response;

    if (request.mode === "navigate") {
      const fallback = await cache.match("./index.html");
      if (fallback) return fallback;
    }
    throw new Error("offline");
  })());
});
