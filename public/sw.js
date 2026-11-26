/* Piggy Duo service worker: offline shell + runtime cache. Bump VERSION on release. */
const VERSION = 'piggy-duo-v1'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return // never cache API / Supabase traffic

  // SPA navigation: network first, fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { caches.open(VERSION).then((c) => c.put('/index.html', r.clone())); return r }).catch(() => caches.match('/index.html')))
    return
  }
  // Static assets: stale-while-revalidate.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone())); return r }).catch(() => hit)
      return hit || net
    }),
  )
})

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'Piggy Duo', body: 'Heo đang chờ bạn!' }
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/icon-192.png', badge: '/icon-192.png' }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.openWindow('/'))
})
