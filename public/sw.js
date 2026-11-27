/* Piggy Duo service worker: network-first + Native iOS/Android Web Push (VAPID) + Background-Only Push Suppression + Reliable Chat Auto-Open. */
const VERSION = 'piggy-duo-v13'
const NAV_CACHE = 'piggy-nav-v1'
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
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== VERSION && k !== NAV_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return

  // Always bypass cache for version.json so the app detects new deployments immediately!
  if (url.pathname.endsWith('/version.json')) {
    e.respondWith(fetch(req, { cache: 'no-store' }))
    return
  }

  // Dynamically inject the saved Partner Invite Link (?gas=...&sheet=...) into manifest.webmanifest's start_url
  // so when the user taps "Add to Home Screen" in iOS Safari / Android Chrome, the Home Screen icon ALWAYS launches with the Google Sheet link embedded!
  if (url.pathname.endsWith('/manifest.webmanifest')) {
    e.respondWith(
      Promise.all([
        fetch(req).then((r) => r.json()).catch(() => ({
          name: 'Our Little Bank',
          short_name: 'Our Little Bank',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#86c5ff',
          theme_color: '#86c5ff',
          icons: [
            { src: './icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: './icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        })),
        caches.open(NAV_CACHE).then((c) => c.match('./_sheet_config_v2')).then((r) => (r ? r.json() : null)).catch(() => null),
      ]).then(([manifest, cfg]) => {
        if (cfg && cfg.appsScriptUrl) {
          const params = new URLSearchParams()
          params.set('gas', cfg.appsScriptUrl)
          if (cfg.spreadsheetId) params.set('sheet', cfg.spreadsheetId)
          if (cfg.passcode) params.set('pin', cfg.passcode)
          manifest.start_url = `./?${params.toString()}`
        }
        return new Response(JSON.stringify(manifest), {
          headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
        })
      }),
    )
    return
  }

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
    const title = msg.title || 'Our Little Bank'
    const body = msg.body || 'Chạm để mở thẳng vào App Our Little Bank!'
    const route = msg.route || '/'
    const tag = msg.tag || 'piggy-test-notif'

    e.waitUntil(
      new Promise((resolve) => setTimeout(resolve, delayMs)).then(() =>
        self.registration.showNotification(title, {
          body,
          icon: './apple-touch-icon.png',
          badge: './icon-192.png',
          tag,
          renotify: true,
          data: { route },
        }),
      ),
    )
  }
})

/**
 * Native Web Push handler:
 * - Suppresses the system notification banner if the user already has the Piggy Duo app open & visible on screen!
 * - Collapses notifications by category tag (`piggy-chat` vs `piggy-update`) so notifications never spam or pile up!
 */
self.addEventListener('push', (e) => {
  let data = { title: 'Our Little Bank', body: 'Người ấy vừa cập nhật quỹ chung!', route: '/' }
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

  const isChat =
    (data.route && String(data.route).includes('chat=1')) ||
    (data.title && String(data.title).includes('💬'))
  const collapseTag = isChat ? 'piggy-chat-latest' : 'piggy-activity-latest'
  const targetRoute = isChat ? '/?chat=1' : data.route || '/'

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the user is actively viewing the app right now, do NOT pop up an OS push banner on top of the app!
      const isAppVisible = windowClients.some(
        (c) => c.focused || c.visibilityState === 'visible',
      )
      if (isAppVisible) {
        return
      }
      return self.registration.showNotification(data.title, {
        body: data.body,
        icon: './apple-touch-icon.png',
        badge: './icon-192.png',
        tag: collapseTag,
        renotify: true,
        data: { route: targetRoute },
      })
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const rawRoute = e.notification.data && e.notification.data.route ? String(e.notification.data.route) : '/'
  const isChat =
    rawRoute.includes('chat=1') ||
    (e.notification.title && String(e.notification.title).includes('💬'))
  const route = isChat ? '/?chat=1' : rawRoute
  const rootScopeUrl = self.registration.scope

  e.waitUntil(
    caches
      .open(NAV_CACHE)
      .then((c) => c.put('./_pending_route', new Response(route)))
      .catch(() => undefined)
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((windowClients) => {
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
