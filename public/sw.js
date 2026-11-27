/* Piggy Duo service worker: network-first + Native iOS/Android Web Push (VAPID) + Background Scheduled Notification + Chat Auto-Open. */
const VERSION = 'piggy-duo-v8'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png']

let pendingLaunchRoute = null

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

/**
 * Supports background scheduled notifications from the client (`SCHEDULE_NOTIFICATION`)
 * and cold-start route handoff (`CLIENT_READY`) when a notification launches a fresh app window.
 */
self.addEventListener('message', (e) => {
  const msg = e.data
  if (!msg || typeof msg !== 'object') return

  if (msg.type === 'CLIENT_READY' && pendingLaunchRoute && e.source) {
    const route = pendingLaunchRoute
    pendingLaunchRoute = null
    e.source.postMessage({ type: 'PIGGY_NAVIGATE', route })
    return
  }

  if (msg.type === 'SCHEDULE_NOTIFICATION') {
    const delayMs = Math.max(0, Math.min(25000, Number(msg.delayMs) || 0))
    const title = msg.title || '🐷 Piggy Duo'
    const body = msg.body || 'Chạm để mở thẳng vào App Piggy Duo!'
    const route = msg.route || '/'
    const tag = msg.tag || `piggy-local-${Date.now()}`

    e.waitUntil(
      new Promise((resolve) => setTimeout(resolve, delayMs)).then(() =>
        self.registration.showNotification(title, {
          body,
          icon: './apple-touch-icon.png',
          badge: './icon-192.png',
          tag,
          data: { route },
        }),
      ),
    )
  }
})

/**
 * Native Web Push handler (wakes up on iPhone Lock Screen with the 🐷 Piggy Duo App Icon
 * and opens directly into the installed Home Screen App when tapped!).
 */
self.addEventListener('push', (e) => {
  let data = { title: '🐷 Piggy Duo', body: 'Người ấy vừa cập nhật heo đất!', route: '/' }
  if (e.data) {
    try {
      const parsed = e.data.json()
      if (parsed && typeof parsed === 'object') {
        data = {
          title: parsed.title || data.title,
          body: parsed.body || parsed.message || data.body,
          route: parsed.route || '/',
        }
      }
    } catch {
      try {
        data = { ...data, body: e.data.text() || data.body }
      } catch {
        /* use default */
      }
    }
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './apple-touch-icon.png',
      badge: './icon-192.png',
      tag: `piggy-push-${Date.now()}`,
      data: { route: data.route || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const route = e.notification.data && e.notification.data.route ? e.notification.data.route : '/'
  // Always use the exact root registration scope URL (no #hash) for openWindow so iOS opens the standalone Home Screen PWA instead of Safari!
  const rootScopeUrl = self.registration.scope

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'PIGGY_NAVIGATE', route })
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        pendingLaunchRoute = route
        return self.clients.openWindow(rootScopeUrl).then((newClient) => {
          if (newClient) {
            setTimeout(() => {
              try {
                newClient.postMessage({ type: 'PIGGY_NAVIGATE', route })
              } catch {}
            }, 600)
          }
          return newClient
        })
      }
    }),
  )
})
