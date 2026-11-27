import { AnimatePresence } from 'framer-motion'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SplashLoader } from '@/components/SplashLoader'
import { allChallenges } from '@/domain/challenges'
import { isGoalReached } from '@/domain/actions'
import { todayIn } from '@/domain/format'
import { confirmedTotals, pendingTotals, progressPct } from '@/domain/stats'
import type { AppState, Journey, Member, MemberId } from '@/domain/types'
import { DomainError } from '@/domain/types'
import { applyTheme, beep, haptic, prefersReducedMotion } from '@/lib/fx'
import { isNotificationForMember, notificationRoute, shouldNotifyEvent } from '@/lib/pushNotify'
import { subscribeNativeWebPush } from '@/lib/webPush'
import { repository } from '@/services'
import type { Repository } from '@/services/repository'

interface Toast { id: number; text: string; tone: 'ok' | 'error'; actionRoute?: string }
interface Fx { id: number; emojis: string[] }

interface StoreValue {
  state: AppState
  repo: Repository
  loading: boolean
  mutating: boolean
  today: string
  journey: Journey | null
  myMemberId: MemberId
  myMember: Member | null
  partnerMemberId: MemberId
  partnerMember: Member | null
  setMyMemberId: (id: MemberId) => void
  progress: number
  confirmed: ReturnType<typeof confirmedTotals>
  pending: ReturnType<typeof pendingTotals>
  goalReached: boolean
  unread: number
  unreadChat: number
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  motionOff: boolean
  toasts: Toast[]
  fx: Fx | null
  toast: (text: string, tone?: Toast['tone'], actionRoute?: string) => void
  dismissToast: (id?: number) => void
  celebrate: (emojis?: string[]) => void
  /** Run a repository mutation, adopt the returned state, surface errors as toasts. */
  run: <T extends AppState | { state: AppState }>(p: Promise<T>) => Promise<T | null>
  syncState: (s: AppState) => void
}

const Ctx = createContext<StoreValue | null>(null)

const DEVICE_ROLE_KEY = 'piggy_my_member'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const [today, setToday] = useState(() => todayIn())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [fx, setFx] = useState<Fx | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [myMemberId, setMyMemberIdState] = useState<MemberId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DEVICE_ROLE_KEY)
      if (saved === 'a' || saved === 'b') return saved
    }
    return 'a'
  })

  const setMyMemberId = useCallback((id: MemberId) => {
    setMyMemberIdState(id)
    try {
      localStorage.setItem(DEVICE_ROLE_KEY, id)
    } catch {}
  }, [])

  const seq = useRef(0)
  const seenNotifIds = useRef<Set<string> | null>(null)
  const initialLoadDoneRef = useRef(false)
  const bootAtRef = useRef(Date.now())
  const [splashDone, setSplashDone] = useState(false)
  const [splashReadyAnim, setSplashReadyAnim] = useState(false)
  const [mutatingCount, setMutatingCount] = useState(0)

  useEffect(() => {
    let off = () => {}
    repository.load().then((loaded) => {
      if (!seenNotifIds.current) {
        seenNotifIds.current = new Set()
      }
      for (const n of loaded.notifications) {
        seenNotifIds.current.add(n.id)
      }
      initialLoadDoneRef.current = true
      setState(loaded)
      setSplashReadyAnim(true)
      setTimeout(() => setSplashDone(true), 420)
    })
    off = repository.subscribe((next) => {
      // Pre-mark any notifications arriving BEFORE initial load completes so historical notifications never fire as new!
      if (!initialLoadDoneRef.current) {
        if (!seenNotifIds.current) seenNotifIds.current = new Set()
        for (const n of next.notifications) {
          seenNotifIds.current.add(n.id)
        }
      }
      setState(next)
    })
    return off
  }, [])

  useEffect(() => {
    const t = setInterval(() => setToday(todayIn(state?.journey?.timezone)), 30_000)
    return () => clearInterval(t)
  }, [state?.journey?.timezone])

  useEffect(() => { if (state) applyTheme(state.settings.theme) }, [state?.settings.theme]) // eslint-disable-line react-hooks/exhaustive-deps

  // Automatically sync this device's Native Web Push subscription to the active member profile (`myMemberId`)
  // and remove this device's endpoint from the partner's profile so 1 phone is never registered as both members!
  const pushSyncedForRef = useRef<string>('')
  useEffect(() => {
    const j = state?.journey
    if (!j || typeof window === 'undefined' || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (pushSyncedForRef.current === myMemberId) return
    pushSyncedForRef.current = myMemberId

    void subscribeNativeWebPush().then((sub) => {
      if (!sub) return
      const otherId: MemberId = myMemberId === 'a' ? 'b' : 'a'
      const curSub = j.members[myMemberId]?.pushSubscription
      const otherSub = j.members[otherId]?.pushSubscription
      const otherHasSameEndpoint = otherSub?.endpoint === sub.endpoint

      if (curSub?.endpoint === sub.endpoint && curSub?.keys?.p256dh === sub.keys.p256dh && !otherHasSameEndpoint) {
        return
      }
      void repository.updateJourney({
        members: {
          ...j.members,
          [myMemberId]: {
            ...j.members[myMemberId],
            pushSubscription: sub,
          },
          [otherId]: {
            ...j.members[otherId],
            pushSubscription: otherHasSameEndpoint ? undefined : otherSub,
          },
        },
      })
    })
  }, [state?.journey, myMemberId])

  useEffect(() => {
    const onOpenChat = () => setChatOpen(true)
    const consumePendingNavFromCache = async () => {
      if (typeof caches === 'undefined') return
      try {
        const cache = await caches.open('piggy-nav-v1')
        const res = await cache.match('./_pending_route')
        if (res) {
          const route = (await res.text()).trim()
          await cache.delete('./_pending_route')
          if (route.includes('chat=1')) {
            setChatOpen(true)
          } else if (route && route !== '/') {
            window.location.hash = `#${route}`
          }
        }
      } catch {
        /* ignore */
      }
    }
    const onHashCheck = () => {
      if (window.location.hash.includes('chat=1') || window.location.search.includes('chat=1')) {
        setChatOpen(true)
        if (window.location.hash.includes('chat=1')) {
          window.history.replaceState(null, '', window.location.pathname + '#/')
        }
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void consumePendingNavFromCache()
      }
    }
    onHashCheck()
    void consumePendingNavFromCache()
    window.addEventListener('piggy:open-chat', onOpenChat)
    window.addEventListener('hashchange', onHashCheck)
    window.addEventListener('focus', consumePendingNavFromCache)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('piggy:open-chat', onOpenChat)
      window.removeEventListener('hashchange', onHashCheck)
      window.removeEventListener('focus', consumePendingNavFromCache)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok', actionRoute?: string) => {
    const id = ++seq.current
    // Replace queue with at most 2 recent items so toasts never pile up
    setToasts((t) => [...t.slice(-1), { id, text, tone, actionRoute }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const dismissToast = useCallback((id?: number) => {
    if (id === undefined) {
      setToasts([])
    } else {
      setToasts((t) => t.filter((x) => x.id !== id))
    }
  }, [])

  // Only toast genuinely new notifications from the PARTNER arriving AFTER initial load,
  // and NEVER fire system/OS browser notifications while the user is already inside the app!
  useEffect(() => {
    if (!state || !initialLoadDoneRef.current) return
    if (seenNotifIds.current === null) {
      seenNotifIds.current = new Set(state.notifications.map((n) => n.id))
      return
    }
    const fresh = state.notifications.filter((n) => !seenNotifIds.current!.has(n.id))
    if (!fresh.length) return
    for (const n of fresh) {
      seenNotifIds.current.add(n.id)
    }
    const newest = fresh[0]
    // Ignore notifications that were created by THIS device's own member or targeted exclusively to the OTHER member
    if (newest.actor && newest.actor === myMemberId) return
    if (!isNotificationForMember(newest, myMemberId, state.journey)) return
    const notifTime = Date.parse(newest.at)
    if (Number.isFinite(notifTime) && notifTime < bootAtRef.current - 5000) return
    if (!shouldNotifyEvent(newest, state.settings)) return
    // If chat drawer is already open, don't cover it with a chat notification banner
    if (newest.type === 'chat' && chatOpen) return
    const { to } = notificationRoute(newest)
    // Show ONLY the quiet in-app top pill toast (never call fireBrowserNotification while the app is open!)
    toast(
      newest.type === 'chat'
        ? `💬 ${newest.title}: ${newest.message} (Chạm để mở chat)`
        : `🔔 ${newest.title}: ${newest.message}`,
      'ok',
      to,
    )
    haptic(state.settings, 30)
    beep(state.settings, 'win')
  }, [state, toast, chatOpen, myMemberId])

  const celebrate = useCallback((emojis = ['🪙', '🎉', '✨', '💗']) => setFx({ id: ++seq.current, emojis }), [])

  const run = useCallback(async <T extends AppState | { state: AppState }>(p: Promise<T>) => {
    setMutatingCount((c) => c + 1)
    try {
      const out = await p
      const nextState: AppState = 'state' in out ? out.state : out
      // Pre-mark any notification generated by our own local mutation as seen so we don't double-toast!
      if (seenNotifIds.current) {
        for (const n of nextState.notifications) {
          seenNotifIds.current.add(n.id)
        }
      }
      setState(nextState)
      return out
    } catch (e) {
      toast(e instanceof DomainError || e instanceof Error ? e.message : 'Có lỗi xảy ra, thử lại nhé.', 'error')
      return null
    } finally {
      setMutatingCount((c) => Math.max(0, c - 1))
    }
  }, [toast])

  const value = useMemo<StoreValue | null>(() => {
    if (!state) return null
    const j = state.journey
    const confirmed = confirmedTotals(state.contributions)
    const partnerMemberId: MemberId = myMemberId === 'a' ? 'b' : 'a'
    const myMember = j ? j.members[myMemberId] : null
    const partnerMember = j ? j.members[partnerMemberId] : null
    const unreadChat = (state.messages ?? []).filter(
      (m) => m.sender !== myMemberId && !(m.readBy ?? []).includes(myMemberId),
    ).length

    return {
      state, repo: repository, loading: false, mutating: mutatingCount > 0, today, journey: j,
      myMemberId, myMember, partnerMemberId, partnerMember, setMyMemberId,
      progress: j ? progressPct(j, state.contributions) : 0,
      confirmed, pending: pendingTotals(state.contributions),
      goalReached: !!j && isGoalReached(state) && confirmed.total >= j.goal,
      unread: state.notifications.filter((n) => !n.read && isNotificationForMember(n, myMemberId, j)).length,
      unreadChat, chatOpen, setChatOpen,
      motionOff: prefersReducedMotion(state.settings),
      toasts, fx, toast, dismissToast, celebrate, run, syncState: setState,
    }
  }, [state, today, toasts, fx, toast, dismissToast, celebrate, run, myMemberId, setMyMemberId, chatOpen, mutatingCount])

  return (
    <Ctx.Provider value={value}>
      {value && children}
      <AnimatePresence>
        {(!value || !splashDone) && <SplashLoader ready={splashReadyAnim} />}
      </AnimatePresence>
    </Ctx.Provider>
  )
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside StoreProvider')
  return v
}

export function useJourney(): Journey {
  const { journey } = useStore()
  if (!journey) throw new Error('No journey')
  return journey
}

export function useChallenges() {
  const { state, today } = useStore()
  return useMemo(() => allChallenges(state).map((def) => ({ def, value: def.value(state, today), status: (state.challengeStatus[def.id] as 'active' | 'completed' | undefined) ?? ('idle' as const) })), [state, today])
}

export function useOnline() {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const u = () => setOn(true), d = () => setOn(false)
    window.addEventListener('online', u); window.addEventListener('offline', d)
    return () => { window.removeEventListener('online', u); window.removeEventListener('offline', d) }
  }, [])
  return on
}
