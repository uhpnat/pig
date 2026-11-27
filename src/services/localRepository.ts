import * as A from '@/domain/actions'
import { secureRand } from '@/domain/engine'
import { todayIn, uid } from '@/domain/format'
import { mergeStates } from '@/domain/merge'
import { buildDemoState } from '@/domain/seed'
import type { AppState } from '@/domain/types'
import type { Repository, SheetSyncConfig, Unsubscribe } from './repository'

const KEY = 'piggy-duo:v1'
const CFG_KEY = 'piggy-duo:gsheets-cfg:v1'
const CHANNEL = 'piggy-duo-sync'
export const DEFAULT_SPREADSHEET_ID = '1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s'
export const HARDCODED_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s/edit?gid=0#gid=0'
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFtLT8KLFNhSlfR51NWfJ13KOAHw4K9th17591nJFmvQVLxvjFOlh9BtTlzfLA41ft/exec'

function extractSpreadsheetId(input: string): string {
  const trimmed = (input || '').trim()
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (m) return m[1]
  return trimmed || DEFAULT_SPREADSHEET_ID
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

function readCfg(): Pick<SheetSyncConfig, 'spreadsheetId' | 'appsScriptUrl' | 'passcode'> {
  // Also allow configuring via URL query parameters on first open: ?gas=...&pin=...
  let urlGas = ''
  let urlPin = ''
  if (typeof location !== 'undefined') {
    const sp = new URLSearchParams(location.search || location.hash.split('?')[1] || '')
    urlGas = sp.get('gas') || ''
    urlPin = sp.get('key') || sp.get('pin') || ''
  }
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const isOldBrokenUrl =
        !parsed.appsScriptUrl ||
        parsed.appsScriptUrl.includes('AKfycbwLMlr3eqKCDTEPLMlXuggYuKsYk_5UBDq45KPSsO16mu-DwEQJauCSL0FXlb5vvibX') ||
        parsed.appsScriptUrl.includes('AKfycbyYVJASdTIlS0A6VhJbpdiEKtaraMnO0zOEF1Au0HijooN5Ykz9KtTq6Jfm2RMfipaj')
      const savedGas = isOldBrokenUrl ? '' : parsed.appsScriptUrl
      const cfg = {
        spreadsheetId: DEFAULT_SPREADSHEET_ID,
        appsScriptUrl: urlGas || savedGas || import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL,
        passcode: urlPin || parsed.passcode || '',
      }
      localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
      return cfg
    }
  } catch {
    /* ignore */
  }
  const fallback = {
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    appsScriptUrl: urlGas || import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL,
    passcode: urlPin || '',
  }
  if (urlGas || urlPin) localStorage.setItem(CFG_KEY, JSON.stringify(fallback))
  return fallback
}

/**
 * Offline-first repository backed by Google Sheets:
 * - On localhost dev server: uses Vite `/api/gsheets` bridge automatically.
 * - On GitHub Pages / static hosts: uses the user's Google Apps Script Web App URL (avoids HTTP 405 from GitHub Pages).
 */
export class LocalRepository implements Repository {
  readonly kind = 'gsheets' as const
  private readonly clientId = uid('cli')
  private readonly bootTime = Date.now()
  private bc: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null
  private listeners = new Set<(s: AppState) => void>()
  private inFlightPull: Promise<AppState | null> | null = null
  private lastPullAt = 0
  private hiddenAt = 0
  private syncStatus: Pick<SheetSyncConfig, 'lastSyncedAt' | 'lastError' | 'syncing'> = {
    lastSyncedAt: null,
    lastError: null,
    syncing: false,
  }

  private realtimeTopic(): string {
    const { spreadsheetId } = readCfg()
    const cleanId = (spreadsheetId || DEFAULT_SPREADSHEET_ID).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)
    return `piggy_duo_rt_${cleanId}`
  }

  /**
   * Instant (<200ms) real-time push over Server-Sent Events (SSE) relay so the partner's phone
   * sees rolls, 1/2 deposit reports, 2/2 confirmations, and name edits immediately without waiting for polling!
   */
  private async broadcastRealtime(state: AppState, forceReplace = false): Promise<void> {
    if (typeof fetch === 'undefined') return
    try {
      const packet = {
        clientId: this.clientId,
        at: Date.now(),
        forceReplace,
        partial: forceReplace
          ? null
          : {
              journey: state.journey,
              reveals: state.reveals.slice(0, 5),
              contributions: state.contributions.slice(0, 20),
              activity: state.activity.slice(0, 10),
              notifications: state.notifications.slice(0, 8),
              milestonesReached: state.milestonesReached,
              messages: (state.messages ?? []).slice(-30),
            },
      }
      await fetch(`https://ntfy.sh/${this.realtimeTopic()}`, {
        method: 'POST',
        body: JSON.stringify(packet),
      })
    } catch {
      /* Fallback to Google Sheets polling silently if offline or blocked */
    }
  }

  private notify(s: AppState) {
    this.listeners.forEach((cb) => cb(s))
  }

  getSheetConfig(): SheetSyncConfig {
    const cfg = readCfg()
    const isStaticHost = !isLocalhost()
    const needsAppsScript = isStaticHost && !cfg.appsScriptUrl
    return { ...cfg, isStaticHost, needsAppsScript, ...this.syncStatus }
  }

  setSheetConfig(patch: Partial<Pick<SheetSyncConfig, 'spreadsheetId' | 'appsScriptUrl' | 'passcode'>>) {
    const cur = readCfg()
    const next = {
      spreadsheetId: patch.spreadsheetId !== undefined ? extractSpreadsheetId(patch.spreadsheetId) : DEFAULT_SPREADSHEET_ID,
      appsScriptUrl: patch.appsScriptUrl !== undefined ? patch.appsScriptUrl.trim() || DEFAULT_APPS_SCRIPT_URL : cur.appsScriptUrl,
      passcode: patch.passcode !== undefined ? patch.passcode.trim() : cur.passcode,
    }
    localStorage.setItem(CFG_KEY, JSON.stringify(next))
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
    if (isLocalhost()) {
      return `/api/gsheets?id=${encodeURIComponent(spreadsheetId)}`
    }
    // On GitHub Pages without an Apps Script URL, do not POST to /api/gsheets (which causes 405 Method Not Allowed)
    return null
  }

  private async pushToSheet(state: AppState, explicit = false, forceReplace = false): Promise<void> {
    if (typeof fetch === 'undefined') return
    const url = this.endpointUrl()
    if (!url) {
      if (explicit) {
        this.syncStatus = {
          ...this.syncStatus,
          syncing: false,
          lastError: 'Trên GitHub Pages, bạn hãy dán Apps Script Web App URL ở bên dưới để đồng bộ với Google Sheet nhé (tránh lỗi 405 của GitHub).',
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
        body: JSON.stringify({ spreadsheetId, passcode, forceReplace, state }),
      })
      const text = await res.text()
      if (text.includes('accounts.google.com') || text.trim().startsWith('<!doctype html>')) {
        throw new Error('Link Apps Script đang để quyền "Chỉ mình tôi" hoặc "Bất kỳ ai có tài khoản Google". Hãy vào Apps Script -> Quản lý bản triển khai -> Sửa -> đổi "Ai có quyền truy cập" thành "Bất kỳ ai (Anyone)" nhé!')
      }
      const data = JSON.parse(text || '{}')
      if (!res.ok || data?.ok === false) {
        if (res.status === 405) {
          throw new Error('GitHub Pages không nhận POST (405). Hãy dán link Google Apps Script Web App URL (https://script.google.com/macros/s/.../exec) vào ô cấu hình bên dưới nhé!')
        }
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

  private async pullFromSheet(explicit = false): Promise<AppState | null> {
    if (typeof fetch === 'undefined') return null
    // Deduplicate concurrent pull calls (e.g. React StrictMode double-mount)
    if (this.inFlightPull) return this.inFlightPull

    const url = this.endpointUrl()
    if (!url) {
      if (explicit) {
        this.syncStatus = {
          ...this.syncStatus,
          syncing: false,
          lastError: 'Trên GitHub Pages, bạn hãy dán Apps Script Web App URL ở bên dưới để tải dữ liệu từ Google Sheet nhé.',
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
          throw new Error('Link Apps Script đang để quyền "Chỉ mình tôi" hoặc "Bất kỳ ai có tài khoản Google". Hãy vào Apps Script -> Quản lý bản triển khai -> Sửa -> đổi "Ai có quyền truy cập" thành "Bất kỳ ai (Anyone)" nhé!')
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
          const merged = explicit || !cur.journey ? remoteState : mergeStates(cur, remoteState)
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

  async syncWithSheet(direction: 'push' | 'pull' = 'push'): Promise<AppState> {
    if (direction === 'pull') {
      const remote = await this.pullFromSheet(true)
      if (remote) return remote
      return read()
    }
    const cur = read()
    await this.pushToSheet(cur, true)
    return cur
  }

  private async mutate(fn: (s: AppState) => AppState): Promise<AppState> {
    const next = fn(read())
    localStorage.setItem(KEY, JSON.stringify(next))
    this.bc?.postMessage('changed')
    this.notify(next)
    // Broadcast instant real-time SSE event (<200ms) AND save to Google Sheets in parallel
    void this.broadcastRealtime(next, false)
    await this.pushToSheet(next, true)
    return read()
  }

  async load() {
    // Always load fresh data from Google Sheets immediately when entering the app!
    const remote = await this.pullFromSheet(true)
    if (remote) return remote
    const local = read()
    if (local.journey) {
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
        // Only pull from Sheet when returning to the app after being hidden in background for >30s
        if (this.hiddenAt > 0 && Date.now() - this.hiddenAt > 30_000 && Date.now() - this.lastPullAt > 30_000) {
          void this.pullFromSheet(true)
        }
      }
    }

    // Event-driven Real-Time Server-Sent Events (SSE) stream:
    // ZERO polling timer — only receives events when the partner actually performs an action!
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
              void this.pullFromSheet(true)
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
  saveJourney(j: Parameters<Repository['saveJourney']>[0]) { return this.mutate((s, ) => A.saveJourney(s, j)) }
  updateJourney(p: Parameters<Repository['updateJourney']>[0]) { return this.mutate((s) => A.updateJourney(s, p)) }

  async revealToday(by: Parameters<Repository['revealToday']>[0], forceReroll = false) {
    if (!forceReroll) {
      await this.pullFromSheet(true).catch(() => null)
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
      void this.broadcastRealtime(out.state, forceReroll)
      await this.pushToSheet(out.state, true, forceReroll)
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
    return this.mutate((s) => A.confirmContribution(s, id, new Date().toISOString(), by))
  }
  addContribution(m: Parameters<Repository['addContribution']>[0], amount: number, notes: string) {
    return this.mutate((s) => A.addContribution(s, m, amount, notes, todayIn(s.journey?.timezone)))
  }
  voidContribution(id: string) { return this.mutate((s) => A.voidContribution(s, id)) }
  startChallenge(id: string) { return this.mutate((s) => A.startChallenge(s, id)) }
  addCustomChallenge(t: string, n: number) { return this.mutate((s) => A.addCustomChallenge(s, t, n)) }
  sendChatMessage(sender: Parameters<Repository['sendChatMessage']>[0], text: string) {
    return this.mutate((s) => A.sendChatMessage(s, sender, text))
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
