// Miggle service worker: offline play after the first visit.
// Bump VERSION to drop old caches (hashed assets make this rarely necessary).
const VERSION = 'v2';
const CACHE = `miggle-${VERSION}`;
const scope = new URL(self.registration.scope);
const CORE = [
  './',
  './unlimited.html',
  './how-to-play.html',
  './data/words.json',
  './data/daily.json',
  './data/unlimited.json',
  './favicon.svg',
  './site.webmanifest',
].map((p) => new URL(p, scope).href);

/** Core pages and data, plus the hashed JS/CSS/fonts those pages and stylesheets reference. */
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE);
  const assets = new Set();
  for (const page of CORE.slice(0, 2)) {
    const html = await (await cache.match(page)).text();
    for (const [, url] of html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)) {
      assets.add(new URL(url, page).href);
    }
  }
  for (const css of [...assets].filter((u) => u.endsWith('.css'))) {
    const text = await (await fetch(css)).text();
    for (const [, url] of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      if (!url.startsWith('data:')) assets.add(new URL(url, css).href);
    }
  }
  await cache.addAll([...assets]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Precached copies were fetched without the page's Origin header, so ignore Vary when matching.
const MATCH = { ignoreVary: true };

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request, { ...MATCH, ignoreSearch: true })) ??
      (await cache.match(new URL('./', scope).href, MATCH)) ??
      Response.error()
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, MATCH);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(event.request, MATCH);
  const refresh = fetch(event.request).then((response) => {
    if (response.ok) cache.put(event.request, response.clone());
    return response;
  });
  if (hit) {
    event.waitUntil(refresh.catch(() => {}));
    return hit;
  }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin) return;
  if (request.mode === 'navigate') event.respondWith(networkFirst(request));
  else if (url.pathname.includes('/assets/')) event.respondWith(cacheFirst(request));
  else event.respondWith(staleWhileRevalidate(event));
});
