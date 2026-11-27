import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './hooks/useStore'
import './index.css'

declare const __APP_BUILD_ID__: string

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
)

/**
 * Automatic Live Update & 3-Second Countdown Auto-Reload System:
 * 1. Polls `./version.json?_t=...` (with `cache: 'no-store'`) on startup, whenever the user returns to the app (`visibilitychange` / `focus`), and every 45 seconds.
 * 2. When a newer `buildId` is deployed on GitHub Pages (or a new Service Worker takes control via `controllerchange`),
 *    shows a 3-second countdown notification banner ("✨ Có bản cập nhật mới! Tự động cập nhật sau 3s… 2s… 1s…"),
 *    then purges stale caches and reloads the app smoothly!
 */
let reloadingForUpdate = false

async function performCleanReload() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k !== 'piggy-nav-v1')
          .map((k) => caches.delete(k)),
      )
    }
  } catch {
    /* ignore */
  }
  window.location.reload()
}

function triggerCleanReload() {
  if (reloadingForUpdate) return
  reloadingForUpdate = true
  let sec = 3
  window.dispatchEvent(new CustomEvent('piggy:update-countdown', { detail: { seconds: sec } }))
  const timer = setInterval(() => {
    sec -= 1
    if (sec > 0) {
      window.dispatchEvent(new CustomEvent('piggy:update-countdown', { detail: { seconds: sec } }))
    } else {
      clearInterval(timer)
      window.dispatchEvent(new CustomEvent('piggy:update-countdown', { detail: { seconds: 0 } }))
      void performCleanReload()
    }
  }, 1000)
}

async function checkForNewDeployment(reg?: ServiceWorkerRegistration | null) {
  if (reloadingForUpdate) return
  try {
    if (reg) {
      void reg.update().catch(() => undefined)
    } else if ('serviceWorker' in navigator) {
      const existing = await navigator.serviceWorker.getRegistration()
      void existing?.update().catch(() => undefined)
    }

    if (!import.meta.env.PROD) return
    const res = await fetch(`./version.json?_t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const data = (await res.json()) as { buildId?: string }
    const currentBuildId = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : ''
    if (data?.buildId && currentBuildId && data.buildId !== currentBuildId) {
      await triggerCleanReload()
    }
  } catch {
    /* ignore network offline */
  }
}

if ('serviceWorker' in navigator) {
  const hadControllerInitially = Boolean(navigator.serviceWorker.controller)

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only auto-reload when an existing Service Worker is replaced by a newly deployed one
    if (hadControllerInitially) {
      void triggerCleanReload()
    }
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        void checkForNewDeployment(reg)
        const active = reg.active || navigator.serviceWorker.controller
        active?.postMessage({ type: 'CLIENT_READY' })
      })
      .catch(() => undefined)
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkForNewDeployment()
    }
  })
  window.addEventListener('focus', () => {
    void checkForNewDeployment()
  })
  // Periodic background check every 45s while the app is open on screen
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      void checkForNewDeployment()
    }
  }, 45_000)

  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'PIGGY_NAVIGATE' && typeof e.data.route === 'string') {
      const route = e.data.route as string
      if (route.includes('chat=1')) {
        window.dispatchEvent(new CustomEvent('piggy:open-chat'))
      } else {
        window.location.hash = `#${route}`
      }
    }
  })
}

// Native-app lock: prevent iOS pinch-to-zoom, double-tap zoom, and long-press image save context menu
if (typeof document !== 'undefined') {
  document.addEventListener(
    'contextmenu',
    (e) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') e.preventDefault()
    },
    { passive: false },
  )
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false } as AddEventListenerOptions)
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false } as AddEventListenerOptions)
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault()
    },
    { passive: false },
  )
}
