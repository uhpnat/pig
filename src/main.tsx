import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './hooks/useStore'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        void reg.update()
        const active = reg.active || navigator.serviceWorker.controller
        active?.postMessage({ type: 'CLIENT_READY' })
      })
      .catch(() => undefined)
  })
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
