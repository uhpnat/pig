import * as A from '@/domain/actions'
import { secureRand } from '@/domain/engine'
import { todayIn, uid } from '@/domain/format'
import { mergeStates } from '@/domain/merge'
import { buildDemoState } from '@/domain/seed'
import type { AppState, MemberId } from '@/domain/types'
import {
  getNtfyTopicForGender,
  getPartnerGender,
  notificationRoute,
  pushNtfyNotification,
} from '@/lib/pushNotify'
import { buildEncryptedWebPush, type EncryptedWebPushRequest } from '@/lib/webPush'
import type { Repository, SheetSyncConfig, Unsubscribe } from './repository'

const KEY = 'piggy-duo:v1'
const CFG_KEY = 'piggy-duo:gsheets-cfg:v2'
const LEGACY_CFG_KEY = 'piggy-duo:gsheets-cfg:v1'
const CFG_CACHE_NAME = 'piggy-nav-v1'
const CFG_CACHE_URL = './_sheet_config_v2'
const CHANNEL = 'piggy-duo-sync'

export function extractSpreadsheetId(input: string): string {
  const trimmed = (input || '').trim()
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (m) return m[1]
  return trimmed
}

function isLocalhost(): boolean {
  if (typeof location === 'undefined') return true
  const h = location.hostname
  return h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.')
}

function read(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      return { ...A.createInitialState(), ...parsed, settings: { ...A.DEFAULT_SETTINGS, ...parsed.settings } }
    }
  } catch {
    /* corrupted storage falls through to a fresh state */
  }
  return A.createInitialState()
}

type StoredCfg = Pick<SheetSyncConfig, 'spreadsheetId' | 'appsScriptUrl' | 'passcode'>

function saveCfgToCacheStorage(cfg: StoredCfg) {
  syncInviteUrlAndManifest(cfg)
  if (typeof caches === 'undefined') return
  if (!cfg.appsScriptUrl && !cfg.spreadsheetId) return
  void caches
    .open(CFG_CACHE_NAME)
    .then((c) => c.put(CFG_CACHE_URL, new Response(JSON.stringify(cfg))))
    .catch(() => undefined)
}

function syncInviteUrlAndManifest(cfg: StoredCfg) {
  if (typeof window === 'undefined' || !cfg.appsScriptUrl) return
  try {
    const params = new URLSearchParams()
    params.set('gas', cfg.appsScriptUrl)
    if (cfg.spreadsheetId) params.set('sheet', cfg.spreadsheetId)
    if (cfg.passcode) params.set('pin', cfg.passcode)
    const queryStr = `?${params.toString()}`

    // Keep `?gas=...&sheet=...` in the browser's address bar (`location.search`) so when the user taps
    // Safari's Share -> "Add to Home Screen", the Home Screen icon bookmarks the Partner Invite URL directly!
    if (window.location.search !== queryStr && window.history?.replaceState) {
      const cleanHash = window.location.hash.split('?')[0] || '#/'
      window.history.replaceState(null, '', `${window.location.pathname}${queryStr}${cleanHash}`)
    }
  } catch {
    /* ignore */
  }
}

async function restoreCfgFromCacheStorage(): Promise<StoredCfg | null> {
  if (typeof caches === 'undefined') return null
  try {
    const c = await caches.open(CFG_CACHE_NAME)
    const res = await c.match(CFG_CACHE_URL)
    if (!res) return null
    const parsed = (await res.json()) as StoredCfg
    if (parsed && (parsed.appsScriptUrl || parsed.spreadsheetId)) {
      localStorage.setItem(CFG_KEY, JSON.stringify(parsed))
      return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

function readCfg(): StoredCfg {
  // 1. Check URL query parameters (both window.location.search and hash query ?gas=...&sheet=...&pin=...)
  let urlGas = ''
  let urlSheet = ''
  let urlPin = ''
  if (typeof location !== 'undefined') {
    const searchParams = new URLSearchParams(location.search || '')
    const hashQuery = location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : ''
    const hashParams = new URLSearchParams(hashQuery)

    urlGas = (searchParams.get('gas') || hashParams.get('gas') || '').trim()
    urlSheet = extractSpreadsheetId(searchParams.get('sheet') || hashParams.get('sheet') || '')
    urlPin = (
      searchParams.get('key') ||
      searchParams.get('pin') ||
      hashParams.get('key') ||
      hashParams.get('pin') ||
      ''
    ).trim()
  }

  let saved: StoredCfg = { spreadsheetId: '', appsScriptUrl: '', passcode: '' }
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      saved = {
        spreadsheetId: extractSpreadsheetId(parsed.spreadsheetId || ''),
        appsScriptUrl: (parsed.appsScriptUrl || '').trim(),
        passcode: (parsed.passcode || '').trim(),
      }
    }
  } catch {
    /* ignore */
  }

  // If URL params are provided (e.g. Person 2 opening Person 1's invite link), persist them permanently and keep them in the URL bar so "Add to Home Screen" bookmarks the full invite link!
  if (urlGas || urlSheet || urlPin) {
    const mergedCfg: StoredCfg = {
      spreadsheetId: urlSheet || saved.spreadsheetId,
      appsScriptUrl: urlGas || saved.appsScriptUrl,
      passcode: urlPin || saved.passcode,
    }
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(mergedCfg))
      if (mergedCfg.passcode) {
        sessionStorage.setItem('piggy-duo:unlocked:v1', mergedCfg.passcode)
        localStorage.setItem('piggy-duo:unlocked:v1', mergedCfg.passcode)
      }
      saveCfgToCacheStorage(mergedCfg)
    } catch {
      /* ignore */
    }
    return mergedCfg
  }

  if (saved.appsScriptUrl) {
    syncInviteUrlAndManifest(saved)
  }
  return saved
}

/**
 * Offline-first repository backed by the user's private Google Sheet & Apps Script Web App URL.
 * Zero hardcoded public sheet URLs — only users who configure their own Google Sheet or open the partner's invite link can connect.
 */
export class LocalRepository implements Repository {
  readonly kind = 'gsheets' as const
  private readonly clientId = uid('cli')
  private readonly bootTime = Date.now()
  private bc: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null
  private listeners = new Set<(s: AppState) => void>()
  private inFlightPull: Promise<AppState | null> | null = null
  private mutationChain: Promise<unknown> = Promise.resolve()
  private lastPullAt = 0
  private hiddenAt = 0
  private syncStatus: Pick<SheetSyncConfig, 'lastSyncedAt' | 'lastError' | 'syncing'> = {
    lastSyncedAt: null,
    lastError: null,
    syncing: false,
  }

  private realtimeTopic(): string {
    const { spreadsheetId, appsScriptUrl } = readCfg()
    const seed = (spreadsheetId || appsScriptUrl || 'unconfigured').replace(/[^a-zA-Z0-9]/g, '').slice(-24)
    return `piggy_duo_rt_${seed}`
  }

  /**
   * Instant (<200ms) real-time push over Server-Sent Events (SSE) relay so the partner's phone
   * sees rolls, 1/2 deposit reports, 2/2 confirmations, and chat messages immediately!
   */
  private async broadcastRealtime(state: AppState, forceReplace = false): Promise<void> {
    if (typeof fetch === 'undefined') return
    const { appsScriptUrl, spreadsheetId } = readCfg()
    if (!appsScriptUrl && !spreadsheetId) return
    try {
      const packet = {
        clientId: this.clientId,
        at: Date.now(),
        forceReplace,
        partial: forceReplace
          ? null
          : {
              journey: state.journey,
              reveals: state.reveals.slice(0, 8),
              contributions: state.contributions.slice(0, 25),
              activity: state.activity.slice(0, 12),
              notifications: state.notifications.slice(0, 10),
              milestonesReached: state.milestonesReached,
              messages: (state.messages ?? []).slice(-50),
            },
      }
      await fetch(`https://ntfy.sh/${this.realtimeTopic()}`, {
        method: 'POST',
        body: JSON.stringify(packet),
      })
    } catch {
      /* Fallback to Google Sheets silently if offline or blocked */
    }
  }

  private notify(s: AppState) {
    this.listeners.forEach((cb) => cb(s))
  }

  getSheetConfig(): SheetSyncConfig {
    const cfg = readCfg()
    const isStaticHost = !isLocalhost()
    const needsAppsScript = isStaticHost ? !cfg.appsScriptUrl : !cfg.appsScriptUrl && !cfg.spreadsheetId
    return { ...cfg, isStaticHost, needsAppsScript, ...this.syncStatus }
  }

  setSheetConfig(patch: Partial<Pick<SheetSyncConfig, 'spreadsheetId' | 'appsScriptUrl' | 'passcode'>>) {
    const cur = readCfg()
    const next: StoredCfg = {
      spreadsheetId: patch.spreadsheetId !== undefined ? extractSpreadsheetId(patch.spreadsheetId) : cur.spreadsheetId,
      appsScriptUrl: patch.appsScriptUrl !== undefined ? patch.appsScriptUrl.trim() : cur.appsScriptUrl,
      passcode: patch.passcode !== undefined ? patch.passcode.trim() : cur.passcode,
    }
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(next))
      localStorage.removeItem(LEGACY_CFG_KEY)
      saveCfgToCacheStorage(next)
    } catch {
      /* ignore */
    }
    this.syncStatus = { ...this.syncStatus, lastError: null }
    this.notify(read())
  }

  private endpointUrl(): string | null {
    const { spreadsheetId, appsScriptUrl, passcode } = readCfg()
    if (appsScriptUrl) {
      if (!passcode) return appsScriptUrl
      const sep = appsScriptUrl.includes('?') ? '&' : '?'
      return `${appsScriptUrl}${sep}key=${encodeURIComponent(passcode)}`
    }
    if (isLocalhost() && spreadsheetId) {
      return `/api/gsheets?id=${encodeURIComponent(spreadsheetId)}`
    }
    return null
  }

  private async pushToSheet(
    state: AppState,
    explicit = false,
    forceReplace = false,
    webPush?: EncryptedWebPushRequest | null,
  ): Promise<void> {
    if (typeof fetch === 'undefined') return
    const url = this.endpointUrl()
    if (!url) {
      if (explicit) {
        this.syncStatus = {
          ...this.syncStatus,
          syncing: false,
          lastError: 'Hãy kết nối Google Sheet & Apps Script Web App URL để đồng bộ dữ liệu giữa 2 máy nhé!',
        }
        this.notify(read())
      }
      return
    }
    const { spreadsheetId, appsScriptUrl, passcode } = readCfg()
    this.syncStatus = { ...this.syncStatus, syncing: true, lastError: null }
    this.notify(state)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': appsScriptUrl ? 'text/plain;charset=utf-8' : 'application/json' },
        body: JSON.stringify({ spreadsheetId, passcode, forceReplace, state, webPush: webPush || undefined }),
      })
      const text = await res.text()
      if (text.includes('accounts.google.com') || text.trim().startsWith('<!doctype html>')) {
        throw new Error('Link Apps Script đang để quyền "Chỉ mình tôi". Hãy vào Apps Script -> Quản lý bản triển khai -> Sửa -> đổi "Ai có quyền truy cập" thành "Bất kỳ ai (Anyone)" nhé!')
      }
      const data = JSON.parse(text || '{}')
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      this.syncStatus = { syncing: false, lastSyncedAt: data.syncedAt || new Date().toISOString(), lastError: null }
      if (data?.state && !forceReplace) {
        const merged = mergeStates(read(), data.state as AppState)
        localStorage.setItem(KEY, JSON.stringify(merged))
        this.bc?.postMessage('changed')
      }
    } catch (e) {
      this.syncStatus = { ...this.syncStatus, syncing: false, lastError: e instanceof Error ? e.message : String(e) }
    } finally {
      this.notify(read())
    }
  }

  /**
   * Pulls latest state from Google Sheets and ALWAYS merges it with local state (`mergeStates(cur, remoteState)`)
   * unless `replaceLocal === true` (so local chat messages or deposits are NEVER wiped out by a slightly older sheet snapshot!).
   */
  private async pullFromSheet(explicit = false, replaceLocal = false): Promise<AppState | null> {
    if (typeof fetch === 'undefined') return null
    if (this.inFlightPull) return this.inFlightPull

    const url = this.endpointUrl()
    if (!url) {
      if (explicit) {
        this.syncStatus = {
          ...this.syncStatus,
          syncing: false,
          lastError: 'Hãy kết nối Google Sheet & Apps Script Web App URL trước khi tải dữ liệu nhé.',
        }
        this.notify(read())
      }
      return null
    }

    this.syncStatus = { ...this.syncStatus, syncing: true, lastError: null }
    this.inFlightPull = (async () => {
      try {
        const bustUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
        const res = await fetch(bustUrl, { method: 'GET', cache: 'no-store' })
        const text = await res.text()
        if (text.includes('accounts.google.com') || text.trim().startsWith('<!doctype html>')) {
          throw new Error('Link Apps Script đang để quyền "Chỉ mình tôi". Hãy vào Apps Script -> Quản lý bản triển khai -> Sửa -> đổi "Ai có quyền truy cập" thành "Bất kỳ ai (Anyone)" nhé!')
        }
        const data = JSON.parse(text || '{}')
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || `HTTP ${res.status}`)
        }
        this.lastPullAt = Date.now()
        this.syncStatus = { syncing: false, lastSyncedAt: data.updatedAt || new Date().toISOString(), lastError: null }
        if (data?.state) {
          const remoteState: AppState = {
            ...A.createInitialState(),
            ...data.state,
            settings: { ...A.DEFAULT_SETTINGS, ...data.state.settings },
          }
          const cur = read()
          const curJson = JSON.stringify(cur)
          // ALWAYS union-merge local & remote state unless replaceLocal is explicitly requested or local has no journey yet!
          const merged = replaceLocal || !cur.journey ? remoteState : mergeStates(cur, remoteState)
          const nextJson = JSON.stringify(merged)

          if (nextJson !== curJson || explicit) {
            localStorage.setItem(KEY, nextJson)
            this.bc?.postMessage('changed')
            this.notify(merged)
          }
          return merged
        }
        return null
      } catch (e) {
        this.syncStatus = { ...this.syncStatus, syncing: false, lastError: e instanceof Error ? e.message : String(e) }
        if (explicit) this.notify(read())
        return null
      } finally {
        this.inFlightPull = null
      }
    })()

    return this.inFlightPull
  }

  async syncWithSheet(direction: 'push' | 'pull' = 'push', replaceLocal = false): Promise<AppState> {
    if (direction === 'pull') {
      const remote = await this.pullFromSheet(true, replaceLocal)
      if (remote) return remote
      return read()
    }
    // Before pushing manually, pull & merge first so we never overwrite the partner's newer messages or deposits!
    await this.pullFromSheet(false, false).catch(() => null)
    const cur = read()
    await this.pushToSheet(cur, true)
    return cur
  }

  private async buildPartnerWebPush(
    state: AppState,
    actorId: MemberId | undefined,
    title: string,
    body: string,
    route: string,
  ): Promise<EncryptedWebPushRequest | null> {
    const j = state.journey
    if (!j) return null
    const activeActor: MemberId =
      actorId || (typeof window !== 'undefined' && localStorage.getItem('piggy_my_member') === 'b' ? 'b' : 'a')
    const partnerId: MemberId = activeActor === 'a' ? 'b' : 'a'
    const mySub = j.members[activeActor]?.pushSubscription
    const partnerSub = j.members[partnerId]?.pushSubscription
    if (!partnerSub) return null
    if (mySub && mySub.endpoint === partnerSub.endpoint) {
      return null
    }
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        const localSub = await reg?.pushManager?.getSubscription()
        if (localSub && localSub.endpoint === partnerSub.endpoint) {
          return null
        }
      } catch {
        /* ignore */
      }
    }
    return buildEncryptedWebPush(partnerSub, { title: title.startsWith('🐷') ? title : `🐷 ${title}`, body, route })
  }

  private mutate(fn: (s: AppState) => AppState, actorId?: MemberId): Promise<AppState> {
    const task = this.mutationChain.then(() => this.runMutateSerial(fn, actorId))
    this.mutationChain = task.catch(() => undefined)
    return task
  }

  private async runMutateSerial(fn: (s: AppState) => AppState, actorId?: MemberId): Promise<AppState> {
    const prev = read()
    const prevTopNotifId = prev.notifications[0]?.id
    const next = fn(prev)
    if (next === prev) {
      return prev
    }
    localStorage.setItem(KEY, JSON.stringify(next))
    this.bc?.postMessage('changed')
    this.notify(next)

    const newestNotif = next.notifications[0]
    let webPushReq: EncryptedWebPushRequest | null = null
    if (newestNotif && newestNotif.id !== prevTopNotifId) {
      const { to } = notificationRoute(newestNotif)
      const targetGender = getPartnerGender(next.journey, actorId)
      const targetTopic = getNtfyTopicForGender(targetGender)
      void pushNtfyNotification(newestNotif.title, newestNotif.message, to, targetTopic)
      webPushReq = await this.buildPartnerWebPush(next, actorId, newestNotif.title, newestNotif.message, to)
    }

    // 1. Broadcast instant real-time SSE event (<200ms)
    void this.broadcastRealtime(next, false)

    // 2. Pull & merge latest remote state right before pushing if our last pull was >4s ago,
    // so even if the partner's Google Apps Script is running an older version without server-side merge,
    // we NEVER overwrite the partner's chat messages, deposits, or reveals!
    let stateToPush = next
    if (this.endpointUrl() && Date.now() - this.lastPullAt > 4000) {
      const pulled = await this.pullFromSheet(false, false).catch(() => null)
      if (pulled) {
        stateToPush = mergeStates(pulled, next)
        localStorage.setItem(KEY, JSON.stringify(stateToPush))
      }
    }

    await this.pushToSheet(stateToPush, true, false, webPushReq)
    return read()
  }

  async load() {
    // 1. If localStorage config is empty (e.g. user added PWA to iOS Home Screen after configuring in Safari),
    // automatically restore the saved Google Sheet config from shared Cache Storage!
    const cfg = readCfg()
    if (!cfg.appsScriptUrl && !cfg.spreadsheetId) {
      await restoreCfgFromCacheStorage()
    } else {
      saveCfgToCacheStorage(cfg)
    }

    // 2. Pull and merge from Google Sheet if configured
    if (this.endpointUrl()) {
      const remote = await this.pullFromSheet(true, false)
      if (remote) {
        // If local had unsynced messages or contributions that weren't on remote yet, push the merged union back
        void this.pushToSheet(remote, false)
        return remote
      }
    }
    const local = read()
    if (local.journey && this.endpointUrl()) {
      void this.pushToSheet(local, false)
    }
    return local
  }

  subscribe(cb: (s: AppState) => void): Unsubscribe {
    this.listeners.add(cb)
    const onMsg = () => cb(read())
    const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === CFG_KEY) cb(read()) }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.hiddenAt = Date.now()
      } else if (document.visibilityState === 'visible') {
        // When returning to the app (e.g. tapping a chat push notification!), pull & merge immediately if hidden > 2s
        if (this.hiddenAt > 0 && Date.now() - this.hiddenAt > 2_000 && Date.now() - this.lastPullAt > 2_000) {
          void this.pullFromSheet(true, false)
        }
      }
    }

    let es: EventSource | null = null
    if (typeof EventSource !== 'undefined') {
      try {
        es = new EventSource(`https://ntfy.sh/${this.realtimeTopic()}/sse`)
        es.onmessage = (ev) => {
          try {
            const outer = JSON.parse(ev.data || '{}')
            if (outer.event && outer.event !== 'message') return
            const payloadStr = typeof outer.message === 'string' ? outer.message : ev.data
            const pkt = JSON.parse(payloadStr || '{}')
            if (!pkt || pkt.clientId === this.clientId) return
            if (typeof pkt.at === 'number' && pkt.at < this.bootTime - 2000) return

            if (pkt.forceReplace) {
              void this.pullFromSheet(true, true)
              return
            }

            if (pkt.partial) {
              const cur = read()
              const curJson = JSON.stringify(cur)
              const incoming: AppState = {
                ...cur,
                journey: pkt.partial.journey ?? cur.journey,
                reveals: pkt.partial.reveals ?? cur.reveals,
                contributions: pkt.partial.contributions ?? cur.contributions,
                activity: pkt.partial.activity ?? cur.activity,
                notifications: pkt.partial.notifications ?? cur.notifications,
                milestonesReached: pkt.partial.milestonesReached ?? cur.milestonesReached,
                messages: pkt.partial.messages ?? cur.messages,
              }
              const merged = mergeStates(cur, incoming)
              const nextJson = JSON.stringify(merged)
              if (nextJson !== curJson) {
                localStorage.setItem(KEY, nextJson)
                this.bc?.postMessage('changed')
                this.notify(merged)
              }
            }
          } catch {
            /* ignore malformed SSE frames */
          }
        }
      } catch {
        /* ignore if EventSource is unavailable */
      }
    }

    this.bc?.addEventListener('message', onMsg)
    window.addEventListener('storage', onStorage)
    window.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      es?.close()
      this.listeners.delete(cb)
      this.bc?.removeEventListener('message', onMsg)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  saveDraft(draft: AppState['draft']) { return this.mutate((s) => A.saveDraft(s, draft)) }
  saveJourney(j: Parameters<Repository['saveJourney']>[0]) { return this.mutate((s) => A.saveJourney(s, j)) }
  updateJourney(p: Parameters<Repository['updateJourney']>[0]) { return this.mutate((s) => A.updateJourney(s, p)) }

  async revealToday(by: Parameters<Repository['revealToday']>[0], forceReroll = false) {
    if (!forceReroll) {
      await this.pullFromSheet(true, false).catch(() => null)
    }
    let cur = read()
    const tz = cur.journey?.timezone
    const today = todayIn(tz)
    if (forceReroll) {
      cur = A.resetTodayReveal(cur, today)
    }
    const out = A.revealToday(cur, today, by, secureRand)
    if (out.created) {
      localStorage.setItem(KEY, JSON.stringify(out.state))
      this.bc?.postMessage('changed')
      this.notify(out.state)
      const newestNotif = out.state.notifications[0]
      let webPushReq: EncryptedWebPushRequest | null = null
      if (newestNotif) {
        const targetGender = getPartnerGender(out.state.journey, by)
        const targetTopic = getNtfyTopicForGender(targetGender)
        void pushNtfyNotification(`🐷 ${newestNotif.title}`, newestNotif.message, '/reveal', targetTopic)
        webPushReq = await this.buildPartnerWebPush(
          out.state,
          by,
          `🐷 ${newestNotif.title}`,
          newestNotif.message,
          '/reveal',
        )
      }
      void this.broadcastRealtime(out.state, forceReroll)
      await this.pushToSheet(out.state, true, forceReroll, webPushReq)
    }
    return { ...out, state: read() }
  }

  async resetTodayReveal() {
    const cur = read()
    const tz = cur.journey?.timezone
    const next = A.resetTodayReveal(cur, todayIn(tz))
    localStorage.setItem(KEY, JSON.stringify(next))
    this.bc?.postMessage('changed')
    void this.broadcastRealtime(next, true)
    await this.pushToSheet(next, true, true)
    return next
  }

  async clearDataKeepConfig() {
    try {
      localStorage.removeItem('piggy_role_confirmed_v2')
      localStorage.removeItem('piggy_gender_configured')
      localStorage.removeItem('piggy_my_member')
    } catch {}
    const cur = read()
    const next = A.clearSavingsDataKeepConfig(cur)
    localStorage.setItem(KEY, JSON.stringify(next))
    this.bc?.postMessage('changed')
    void this.broadcastRealtime(next, true)
    await this.pushToSheet(next, true, true)
    return next
  }

  confirmContribution(id: string, by?: Parameters<Repository['confirmContribution']>[1]) {
    return this.mutate((s) => A.confirmContribution(s, id, new Date().toISOString(), by), by)
  }
  addContribution(m: Parameters<Repository['addContribution']>[0], amount: number, notes: string) {
    return this.mutate((s) => A.addContribution(s, m, amount, notes, todayIn(s.journey?.timezone)), m)
  }
  voidContribution(id: string) { return this.mutate((s) => A.voidContribution(s, id)) }
  startChallenge(id: string) { return this.mutate((s) => A.startChallenge(s, id)) }
  addCustomChallenge(t: string, n: number) { return this.mutate((s) => A.addCustomChallenge(s, t, n)) }
  sendChatMessage(sender: Parameters<Repository['sendChatMessage']>[0], text: string) {
    return this.mutate((s) => A.sendChatMessage(s, sender, text), sender)
  }
  markChatRead(by: Parameters<Repository['markChatRead']>[0]) {
    return this.mutate((s) => A.markChatRead(s, by))
  }
  markNotificationsRead() { return this.mutate(A.markNotificationsRead) }
  updateSettings(p: Parameters<Repository['updateSettings']>[0]) { return this.mutate((s) => A.updateSettings(s, p)) }
  regenerateInvite() { return this.mutate((s) => A.regenerateInvite(s)) }
  loadDemo() { return this.mutate(() => ({ ...buildDemoState(), settings: read().settings })) }
  reset() {
    try {
      localStorage.removeItem('piggy_role_confirmed_v2')
      localStorage.removeItem('piggy_gender_configured')
      localStorage.removeItem('piggy_my_member')
    } catch {}
    return this.mutate(() => ({ ...A.createInitialState(), settings: read().settings }))
  }
  async exportData() { return JSON.stringify(read(), null, 2) }
}
