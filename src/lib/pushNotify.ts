import type { AppNotification, AppSettings, Gender, Journey, MemberId } from '@/domain/types'

export const NTFY_TOPIC_KEY = 'piggy_ntfy_topic_v1'
export const DEFAULT_NTFY_TOPIC = 'piggy_vi_tram'

export function getNtfyBaseTopic(): string {
  if (typeof window === 'undefined') return DEFAULT_NTFY_TOPIC
  try {
    const raw = (localStorage.getItem(NTFY_TOPIC_KEY) || '').trim()
    return raw.replace(/_(nam|nu)$/i, '') || DEFAULT_NTFY_TOPIC
  } catch {
    return DEFAULT_NTFY_TOPIC
  }
}

export function setNtfyBaseTopic(topic: string): string {
  const clean =
    topic
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .replace(/_(nam|nu)$/i, '') || DEFAULT_NTFY_TOPIC
  try {
    localStorage.setItem(NTFY_TOPIC_KEY, clean)
  } catch {
    /* ignore */
  }
  return clean
}

/** Returns the dedicated ntfy topic for Male (`_nam`) or Female (`_nu`). */
export function getNtfyTopicForGender(gender: Gender, baseOverride?: string): string {
  const base = (baseOverride || getNtfyBaseTopic()).trim() || DEFAULT_NTFY_TOPIC
  return `${base}_${gender === 'male' ? 'nam' : 'nu'}`
}

/**
 * Given the Journey and the member who just performed an action (`actorId`),
 * returns the partner's gender so we push the notification to the PARTNER's phone (`_nam` or `_nu`)!
 */
export function getPartnerGender(journey: Journey | null, actorId?: MemberId): Gender {
  if (!journey) return 'female'
  const activeActor: MemberId =
    actorId ||
    (typeof window !== 'undefined' && localStorage.getItem('piggy_my_member') === 'b' ? 'b' : 'a')
  const partnerId: MemberId = activeActor === 'a' ? 'b' : 'a'
  const partner = journey.members[partnerId]
  if (partner?.gender) return partner.gender
  const actor = journey.members[activeActor]
  return actor?.gender === 'male' ? 'female' : 'male'
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
      return { to: '/?chat=1', label: 'Mở khung Chat →' }
    case 'invite':
    case 'recap':
      return { to: '/couple', label: 'Xem Của mình →' }
    default:
      return { to: '/', label: 'Về Trang chủ →' }
  }
}

/**
 * Sends a rich Vietnamese Push Notification to the target `ntfy` topic (`_nam` or `_nu`) via `https://ntfy.sh`.
 * Works 24/7 even when the Piggy Duo web app is completely closed!
 */
export async function pushNtfyNotification(
  title: string,
  message: string,
  _route = '/',
  targetTopic?: string,
): Promise<boolean> {
  if (typeof fetch === 'undefined') return false
  const topic = (targetTopic || getNtfyTopicForGender('female')).trim()
  if (!topic) return false
  const appBase =
    typeof location !== 'undefined' && location.origin.includes('github.io')
      ? `${location.origin}${location.pathname}`
      : 'https://uhpnat.github.io/pig/'
  // Keep clickUrl strictly equal to the clean PWA start_url (without trailing #hash)
  const clickUrl = appBase
  const iconUrl = `${appBase}icon-192.png`

  try {
    const res = await fetch('https://ntfy.sh', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        title,
        message,
        // Priority 5 (Max/Urgent) triggers immediate Time-Sensitive APNs push on iOS and Heads-Up banner with sound on Android!
        priority: 5,
        tags: ['pig', 'bell'],
        icon: iconUrl,
        click: clickUrl,
        actions: [
          {
            action: 'view',
            label: '🐷 Mở Piggy Duo ngay',
            url: clickUrl,
            clear: true,
          },
        ],
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
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: tag || `piggy-${Date.now()}`,
          data: { route },
        })
        return
      }
    }
    const notif = new Notification(title, { body, icon: './icon-192.png', tag })
    notif.onclick = () => {
      window.focus()
      if (route.includes('chat=1')) {
        window.dispatchEvent(new CustomEvent('piggy:open-chat'))
      } else {
        window.location.hash = `#${route}`
      }
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

/**
 * Checks whether a notification is relevant to `myMemberId` (Nam or Nữ):
 * - If `n.actor === myMemberId` and it's not a shared ('all') milestone/goal/2-2 completion, hide it from the sender!
 * - If `n.target` is explicitly set to the other member (`'a'` or `'b'`), hide it from this member!
 * - Legacy notifications without `target`/`actor`: infer from title (e.g. if title starts with my own name + "nhắn tin" / "vừa mở số" / "vừa nạp", it was meant for the partner!).
 */
export function isNotificationForMember(
  n: AppNotification,
  myMemberId: MemberId,
  journey: Journey | null,
): boolean {
  if (n.target && n.target !== 'all') {
    return n.target === myMemberId
  }
  if (n.actor && n.actor === myMemberId && n.target !== 'all') {
    return false
  }
  // Legacy heuristic for older notifications stored in Google Sheet before `target` field existed:
  const myName = journey?.members[myMemberId]?.name
  if (myName && !n.target) {
    if (
      n.title.includes(`${myName} nhắn tin`) ||
      n.title.includes(`${myName} vừa mở số`) ||
      n.title.includes(`${myName} vừa nạp`) ||
      n.title.includes(`${myName} đã duyệt khoản`)
    ) {
      return false
    }
  }
  return true
}
