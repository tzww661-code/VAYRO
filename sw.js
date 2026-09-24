const CACHE_NAME = 'vayro-v1.0.0';
const RUNTIME_CACHE = 'vayro-runtime-v1';
const PRECACHE_URLS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
            .catch(() => {})
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => Promise.all(
            names.filter((n) => n !== CACHE_NAME && n !== RUNTIME_CACHE)
                .map((n) => caches.delete(n))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET') return;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.hostname.includes('supabase.co')) return;
    if (url.hostname.includes('googleapis.com')) return;
    if (url.hostname.includes('gstatic.com')) return;
    if (url.hostname.includes('cloudflare.com')) return;
    if (url.hostname.includes('jsdelivr.net')) return;

    if (request.destination === 'document' || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(request).then((r) => {
                const copy = r.clone();
                caches.open(CACHE_NAME).then((c) => c.put(request, copy));
                return r;
            }).catch(() => caches.match(request).then((r) => r || caches.match('./index.html')))
        );
        return;
    }

    if (['image', 'font', 'style', 'script'].includes(request.destination)) {
        event.respondWith(
            caches.match(request).then((cached) => cached || fetch(request).then((r) => {
                if (!r || r.status !== 200 || r.type === 'opaque') return r;
                const copy = r.clone();
                caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
                return r;
            }).catch(() => cached))
        );
        return;
    }

    event.respondWith(
        fetch(request).then((r) => {
            const copy = r.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
            return r;
        }).catch(() => caches.match(request))
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
    if (event.data?.type === 'CLEAR_CACHE') {
        caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }
});
