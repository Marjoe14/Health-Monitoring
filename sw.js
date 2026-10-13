// ========================================
// SERVICE WORKER — Smart Community Health Monitoring
// ========================================
const SW_VERSION = 'v1.0.0';
const STATIC_CACHE = `brgy-static-${SW_VERSION}`;
const RUNTIME_CACHE = `brgy-runtime-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/css/style.css',
    '/css/login.css',
    '/css/register.css',
    '/css/resident.css',
    '/css/bhw.css',
    '/css/official.css',
    '/js/script.js',
    '/js/login.js',
    '/js/register.js',
    '/js/resident-state.js',
    '/js/resident-helpers.js',
    '/js/resident-navigation.js',
    '/js/resident-profile.js',
    '/js/resident-notifications.js',
    '/js/resident-appointments.js',
    '/js/resident-init.js',
    '/js/resident-health-records.js',
    '/js/bhw-state.js',
    '/js/bhw-helpers.js',
    '/js/bhw-ui.js',
    '/js/bhw-navigation.js',
    '/js/bhw-residents.js',
    '/js/bhw-bmi.js',
    '/js/bhw-pregnancy.js',
    '/js/bhw-prenatal.js',
    '/js/bhw-immunization.js',
    '/js/bhw-opt.js',
    '/js/bhw-appointments.js',
    '/js/bhw-notifications.js',
    '/js/bhw-sms.js',
    '/js/bhw-settings.js',
    '/js/bhw-search.js',
    '/js/bhw-init.js',
    '/js/vaccine_management.js',
    '/js/bhw-reports.js',
    '/js/official.js',
    '/js/bhw-actions.js',
    '/js/official-activity-logs.js',
    '/js/offline-db.js',
    '/js/offline-sync.js',
    '/js/offline-banner.js',
    '/js/pwa-init.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap'
];

// ---- INSTALL ----
self.addEventListener('install', (event) => {
    console.log('[SW] Installing', SW_VERSION);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => Promise.all(
                PRECACHE_ASSETS.map((url) =>
                    cache.add(url).catch((err) => console.warn('[SW] Failed to cache:', url, err))
                )
            ))
            .then(() => self.skipWaiting())
    );
});

// ---- ACTIVATE ----
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating', SW_VERSION);
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
                    .map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// ---- FETCH ----
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;

    const isSameOrigin = url.origin === self.location.origin;
    const isKnownCDN =
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('cdn.jsdelivr.net');

    if (!isSameOrigin && !isKnownCDN) return;

    if (isSameOrigin && url.pathname.includes('/ajax/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(navigationStrategy(request));
        return;
    }

    event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) {
        fetch(request).then((res) => {
            if (res && res.status === 200) cache.put(request, res.clone());
        }).catch(() => {});
        return cached;
    }
    try {
        const res = await fetch(request);
        if (res && res.status === 200) cache.put(request, res.clone());
        return res;
    } catch (err) {
        if (request.destination === 'image') return new Response('', { status: 204 });
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    const runtime = await caches.open(RUNTIME_CACHE);
    try {
        const res = await fetch(request);
        if (res && res.status === 200) runtime.put(request, res.clone());
        return res;
    } catch (err) {
        const cached = await runtime.match(request);
        if (cached) return cached;
        return new Response(
            JSON.stringify({ success: false, offline: true, message: 'You are offline.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function navigationStrategy(request) {
    try {
        const res = await fetch(request);
        if (res && res.status === 200) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, res.clone());
        }
        return res;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offline = await caches.match(OFFLINE_URL);
        if (offline) return offline;
        return new Response('Offline', { status: 503 });
    }
}

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'brgy-sync-queue') {
        event.waitUntil(
            self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
                clients.forEach((c) => c.postMessage({ type: 'PROCESS_SYNC_QUEUE' }));
            })
        );
    }
});

console.log('[SW] Loaded', SW_VERSION);