import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { allChallenges } from '@/domain/challenges'
import { isGoalReached } from '@/domain/actions'
import { todayIn } from '@/domain/format'
import { confirmedTotals, pendingTotals, progressPct } from '@/domain/stats'
import type { AppState, Journey, Member, MemberId } from '@/domain/types'
import { DomainError } from '@/domain/types'
import { applyTheme, beep, haptic, prefersReducedMotion } from '@/lib/fx'
import { fireBrowserNotification, shouldNotifyEvent } from '@/lib/pushNotify'
import { repository } from '@/services'
import type { Repository } from '@/services/repository'

interface Toast { id: number; text: string; tone: 'ok' | 'error' }
interface Fx { id: number; emojis: string[] }

interface StoreValue {
  state: AppState
  repo: Repository
  loading: boolean
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
  motionOff: boolean
  toasts: Toast[]
  fx: Fx | null
  toast: (text: string, tone?: Toast['tone']) => void
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

  useEffect(() => {
    let off = () => {}
    repository.load().then(setState)
    off = repository.subscribe(setState)
    return off
  }, [])

  // Roll over to a new day while the app stays open.
  useEffect(() => {
    const t = setInterval(() => setToday(todayIn(state?.journey?.timezone)), 30_000)
    return () => clearInterval(t)
  }, [state?.journey?.timezone])

  useEffect(() => { if (state) applyTheme(state.settings.theme) }, [state?.settings.theme]) // eslint-disable-line react-hooks/exhaustive-deps

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  // Whenever state.notifications gains a new item (from our own action OR from 6s realtime Google Sheet sync),
  // fire a system/PWA notification + in-app toast + gentle sound/haptic!
  useEffect(() => {
    if (!state) return
    if (seenNotifIds.current === null) {
      seenNotifIds.current = new Set(state.notifications.map((n) => n.id))
      return
    }
    const fresh = state.notifications.filter((n) => !seenNotifIds.current!.has(n.id))
    if (!fresh.length) return
    for (const n of fresh) {
      seenNotifIds.current.add(n.id)
      if (!shouldNotifyEvent(n, state.settings)) continue
      void fireBrowserNotification(`🐷 ${n.title}`, n.message, n.id)
      toast(`🔔 ${n.title}: ${n.message}`)
      haptic(state.settings, 35)
      beep(state.settings, 'win')
    }
  }, [state, toast])

  const celebrate = useCallback((emojis = ['🪙', '🎉', '✨', '💗']) => setFx({ id: ++seq.current, emojis }), [])

  const run = useCallback(async <T extends AppState | { state: AppState }>(p: Promise<T>) => {
    try {
      const out = await p
      setState('state' in out ? out.state : out)
      return out
    } catch (e) {
      toast(e instanceof DomainError || e instanceof Error ? e.message : 'Có lỗi xảy ra, thử lại nhé.', 'error')
      return null
    }
  }, [toast])

  const value = useMemo<StoreValue | null>(() => {
    if (!state) return null
    const j = state.journey
    const confirmed = confirmedTotals(state.contributions)
    const partnerMemberId: MemberId = myMemberId === 'a' ? 'b' : 'a'
    const myMember = j ? j.members[myMemberId] : null
    const partnerMember = j ? j.members[partnerMemberId] : null

    return {
      state, repo: repository, loading: false, today, journey: j,
      myMemberId, myMember, partnerMemberId, partnerMember, setMyMemberId,
      progress: j ? progressPct(j, state.contributions) : 0,
      confirmed, pending: pendingTotals(state.contributions),
      goalReached: !!j && isGoalReached(state) && confirmed.total >= j.goal,
      unread: state.notifications.filter((n) => !n.read).length,
      motionOff: prefersReducedMotion(state.settings),
      toasts, fx, toast, celebrate, run, syncState: setState,
    }
  }, [state, today, toasts, fx, toast, celebrate, run, myMemberId, setMyMemberId])

  if (!value) return <div className="grid h-screen place-items-center text-xl font-black text-vio">🐷 Đang tải…</div>
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside StoreProvider')
  return v
}

/** Journey that is guaranteed to exist (use inside guarded routes). */
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

