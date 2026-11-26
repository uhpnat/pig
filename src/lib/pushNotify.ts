import type { AppNotification, AppSettings } from '@/domain/types'

/**
 * Triggers a native OS / PWA system notification (via ServiceWorker when installed as PWA, or Notification API).
 */
export async function fireBrowserNotification(title: string, body: string, tag?: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: tag || `piggy-${Date.now()}`,
        })
        return
      }
    }
    new Notification(title, { body, icon: './icon-192.png', tag })
  } catch {
    /* ignore if blocked by OS */
  }
}

export function shouldNotifyEvent(n: AppNotification, s: AppSettings): boolean {
  if (n.type === 'reveal') return s.notifyReveal
  if (n.type === 'partner_confirmed') return s.notifyPartner
  if (n.type === 'recap') return s.notifyRecap
  return true
}
