import type { AppNotification, AppSettings } from '@/domain/types'

/** Maps a notification type to the corresponding in-app route. */
export function notificationRoute(n: Pick<AppNotification, 'type' | 'title'>): { to: string; label: string } {
  switch (n.type) {
    case 'reveal':
      return { to: '/reveal', label: 'Mở số & Xác nhận →' }
    case 'partner_confirmed':
    case 'pending':
      return { to: '/journal', label: 'Xem Nhật ký →' }
    case 'challenge':
      return { to: '/challenges', label: 'Xem Thử thách →' }
    case 'milestone':
    case 'goal':
      return { to: '/pig', label: 'Xem Heo đất →' }
    case 'invite':
    case 'recap':
      return { to: '/couple', label: 'Xem Của mình →' }
    default:
      return { to: '/', label: 'Về Trang chủ →' }
  }
}

/**
 * Triggers a native OS / PWA system notification (via ServiceWorker when installed as PWA, or Notification API).
 */
export async function fireBrowserNotification(title: string, body: string, tag?: string, route = '/') {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const hashUrl = `./#${route}`
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: tag || `piggy-${Date.now()}`,
          data: { url: hashUrl },
        })
        return
      }
    }
    const notif = new Notification(title, { body, icon: './icon-192.png', tag })
    notif.onclick = () => {
      window.focus()
      window.location.hash = `#${route}`
      notif.close()
    }
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
