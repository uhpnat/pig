import type { AppNotification, AppSettings } from '@/domain/types'

export const NTFY_TOPIC_KEY = 'piggy_ntfy_topic_v1'
export const DEFAULT_NTFY_TOPIC = 'piggy_vi_tram'

export function getNtfyTopic(): string {
  if (typeof window === 'undefined') return DEFAULT_NTFY_TOPIC
  try {
    return (localStorage.getItem(NTFY_TOPIC_KEY) || '').trim() || DEFAULT_NTFY_TOPIC
  } catch {
    return DEFAULT_NTFY_TOPIC
  }
}

export function setNtfyTopic(topic: string): string {
  const clean = topic.trim().replace(/[^a-zA-Z0-9_-]/g, '') || DEFAULT_NTFY_TOPIC
  try {
    localStorage.setItem(NTFY_TOPIC_KEY, clean)
  } catch {
    /* ignore */
  }
  return clean
}

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
      return { to: '/', label: 'Xem Heo đất →' }
    case 'chat':
      return { to: '/', label: 'Mở khung Chat →' }
    case 'invite':
    case 'recap':
      return { to: '/couple', label: 'Xem Của mình →' }
    default:
      return { to: '/', label: 'Về Trang chủ →' }
  }
}

/**
 * Sends a rich Vietnamese Push Notification to the `ntfy` mobile app (iOS / Android) via `https://ntfy.sh`.
 * Works 24/7 even when the Piggy Duo web app is completely closed!
 */
export async function pushNtfyNotification(
  title: string,
  message: string,
  route = '/',
  topicOverride?: string,
): Promise<boolean> {
  if (typeof fetch === 'undefined') return false
  const topic = (topicOverride || getNtfyTopic()).trim()
  if (!topic) return false
  const appBase =
    typeof location !== 'undefined' && location.origin.includes('github.io')
      ? `${location.origin}${location.pathname}`
      : 'https://uhpnat.github.io/pig/'
  const clickUrl = `${appBase}#${route}`

  try {
    const res = await fetch('https://ntfy.sh', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        title,
        message,
        priority: 4,
        tags: ['pig'],
        click: clickUrl,
      }),
    })
    return res.ok
  } catch {
    return false
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
