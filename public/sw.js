/* Piggy Duo service worker: network-first so new deployments always appear immediately, falling back to cache offline. */
const VERSION = 'piggy-duo-v5'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png']

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => undefined))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return

  // Network-first for all same-origin requests so updates on GitHub Pages take effect immediately on reload!
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r.ok) {
          const copy = r.clone()
          caches.open(VERSION).then((c) => c.put(req, copy))
        }
        return r
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
  )
})

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'Piggy Duo', body: 'Heo đang chờ bạn!', url: './' }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: { url: data.url || './' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const relUrl = e.notification.data && e.notification.data.url ? e.notification.data.url : './'
  const targetUrl = new URL(relUrl, self.registration.scope).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    }),
  )
})
