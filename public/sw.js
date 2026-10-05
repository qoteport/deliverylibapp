// AURA Monrovia Food Delivery Service Worker
const CACHE_NAME = 'aura-monrovia-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-caching assets notice:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Clearing old service worker cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Only handle HTTP/HTTPS GET requests; ignore chrome-extension://, moz-extension://, etc.
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }

  // Bypass service worker for Firebase, Google APIs, Twilio, and API routes
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('twilio.com') ||
    url.includes('/api/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Navigation requests: Network-first with SPA index.html fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy).catch(() => {});
            });
            return response;
          }
          // If server returned 404 on dynamic SPA sub-path (e.g., /driver/..., /restaurant/...)
          return caches.match('/index.html').then((cachedIndex) => {
            return cachedIndex || response;
          });
        })
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
          return new Response('Offline - please reconnect to internet', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // Static assets: Cache-first with network background revalidation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return cachedResponse || new Response('', { status: 408 });
        });

      return cachedResponse || networkFetch;
    })
  );
});

// Handle clicking on mobile push / browser notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
