import * as A from '@/domain/actions'
import { secureRand } from '@/domain/engine'
import { todayIn } from '@/domain/format'
import { buildDemoState } from '@/domain/seed'
import type { AppState } from '@/domain/types'
import type { Repository, SheetSyncConfig, Unsubscribe } from './repository'

const KEY = 'piggy-duo:v1'
const CFG_KEY = 'piggy-duo:gsheets-cfg:v1'
const CHANNEL = 'piggy-duo-sync'
export const DEFAULT_SPREADSHEET_ID = '1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s'

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

function readCfg(): Pick<SheetSyncConfig, 'spreadsheetId' | 'appsScriptUrl'> {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        spreadsheetId: parsed.spreadsheetId || import.meta.env.VITE_GOOGLE_SHEET_ID || DEFAULT_SPREADSHEET_ID,
        appsScriptUrl: parsed.appsScriptUrl || import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '',
      }
    }
  } catch {
    /* ignore */
  }
  return {
    spreadsheetId: import.meta.env.VITE_GOOGLE_SHEET_ID || DEFAULT_SPREADSHEET_ID,
    appsScriptUrl: import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '',
  }
}

/**
 * Offline-first repository backed by Google Sheets (via Vite `/api/gsheets` bridge or Google Apps Script Web App URL)
 * with instant localStorage caching and multi-tab BroadcastChannel synchronization.
 */
export class LocalRepository implements Repository {
  readonly kind = 'gsheets' as const
  private bc: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null
  private listeners = new Set<(s: AppState) => void>()
  private syncStatus: Pick<SheetSyncConfig, 'lastSyncedAt' | 'lastError' | 'syncing'> = {
    lastSyncedAt: null,
    lastError: null,
    syncing: false,
  }

  private notify(s: AppState) {
    this.listeners.forEach((cb) => cb(s))
  }

  getSheetConfig(): SheetSyncConfig {
    const cfg = readCfg()
    return { ...cfg, ...this.syncStatus }
  }

  setSheetConfig(patch: Partial<Pick<SheetSyncConfig, 'spreadsheetId' | 'appsScriptUrl'>>) {
    const cur = readCfg()
    const next = {
      spreadsheetId: patch.spreadsheetId !== undefined ? patch.spreadsheetId.trim() || DEFAULT_SPREADSHEET_ID : cur.spreadsheetId,
      appsScriptUrl: patch.appsScriptUrl !== undefined ? patch.appsScriptUrl.trim() : cur.appsScriptUrl,
    }
    localStorage.setItem(CFG_KEY, JSON.stringify(next))
    this.notify(read())
  }

  private endpointUrl(): string {
    const { spreadsheetId, appsScriptUrl } = readCfg()
    if (appsScriptUrl) return appsScriptUrl
    return `/api/gsheets?id=${encodeURIComponent(spreadsheetId)}`
  }

  private async pushToSheet(state: AppState): Promise<void> {
    if (typeof fetch === 'undefined') return
    const { spreadsheetId, appsScriptUrl } = readCfg()
    this.syncStatus = { ...this.syncStatus, syncing: true, lastError: null }
    this.notify(state)
    try {
      const res = await fetch(this.endpointUrl(), {
        method: 'POST',
        headers: { 'Content-Type': appsScriptUrl ? 'text/plain;charset=utf-8' : 'application/json' },
        body: JSON.stringify({ spreadsheetId, state }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      this.syncStatus = { syncing: false, lastSyncedAt: data.syncedAt || new Date().toISOString(), lastError: null }
    } catch (e) {
      this.syncStatus = { ...this.syncStatus, syncing: false, lastError: e instanceof Error ? e.message : String(e) }
    } finally {
      this.notify(read())
    }
  }

  private async pullFromSheet(): Promise<AppState | null> {
    if (typeof fetch === 'undefined') return null
    this.syncStatus = { ...this.syncStatus, syncing: true, lastError: null }
    try {
      const res = await fetch(this.endpointUrl(), { method: 'GET' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      this.syncStatus = { syncing: false, lastSyncedAt: data.updatedAt || new Date().toISOString(), lastError: null }
      if (data?.state) {
        const merged: AppState = {
          ...A.createInitialState(),
          ...data.state,
          settings: { ...A.DEFAULT_SETTINGS, ...data.state.settings },
        }
        localStorage.setItem(KEY, JSON.stringify(merged))
        this.bc?.postMessage('changed')
        this.notify(merged)
        return merged
      }
      return null
    } catch (e) {
      this.syncStatus = { ...this.syncStatus, syncing: false, lastError: e instanceof Error ? e.message : String(e) }
      return null
    }
  }

  async syncWithSheet(direction: 'push' | 'pull' = 'push'): Promise<AppState> {
    if (direction === 'pull') {
      const remote = await this.pullFromSheet()
      if (remote) return remote
      return read()
    }
    const cur = read()
    await this.pushToSheet(cur)
    return cur
  }

  private commit(next: AppState): AppState {
    localStorage.setItem(KEY, JSON.stringify(next))
    this.bc?.postMessage('changed')
    void this.pushToSheet(next)
    return next
  }

  private mutate(fn: (s: AppState) => AppState): Promise<AppState> {
    try {
      return Promise.resolve(this.commit(fn(read())))
    } catch (e) {
      return Promise.reject(e)
    }
  }

  async load() {
    const local = read()
    void this.pullFromSheet().then((remote) => {
      if (!remote && local.journey) {
        void this.pushToSheet(local)
      }
    })
    return local
  }

  subscribe(cb: (s: AppState) => void): Unsubscribe {
    this.listeners.add(cb)
    const onMsg = () => cb(read())
    const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === CFG_KEY) cb(read()) }
    this.bc?.addEventListener('message', onMsg)
    window.addEventListener('storage', onStorage)
    return () => {
      this.listeners.delete(cb)
      this.bc?.removeEventListener('message', onMsg)
      window.removeEventListener('storage', onStorage)
    }
  }

  saveDraft(draft: AppState['draft']) { return this.mutate((s) => A.saveDraft(s, draft)) }
  saveJourney(j: Parameters<Repository['saveJourney']>[0]) { return this.mutate((s) => A.saveJourney(s, j)) }
  updateJourney(p: Parameters<Repository['updateJourney']>[0]) { return this.mutate((s) => A.updateJourney(s, p)) }

  async revealToday(by: Parameters<Repository['revealToday']>[0]) {
    const cur = read()
    const tz = cur.journey?.timezone
    const out = A.revealToday(cur, todayIn(tz), by, secureRand)
    if (out.created) this.commit(out.state)
    return out
  }

  confirmContribution(id: string) { return this.mutate((s) => A.confirmContribution(s, id)) }
  addContribution(m: Parameters<Repository['addContribution']>[0], amount: number, notes: string) {
    return this.mutate((s) => A.addContribution(s, m, amount, notes, todayIn(s.journey?.timezone)))
  }
  voidContribution(id: string) { return this.mutate((s) => A.voidContribution(s, id)) }
  startChallenge(id: string) { return this.mutate((s) => A.startChallenge(s, id)) }
  addCustomChallenge(t: string, n: number) { return this.mutate((s) => A.addCustomChallenge(s, t, n)) }
  markNotificationsRead() { return this.mutate(A.markNotificationsRead) }
  updateSettings(p: Parameters<Repository['updateSettings']>[0]) { return this.mutate((s) => A.updateSettings(s, p)) }
  regenerateInvite() { return this.mutate((s) => A.regenerateInvite(s)) }
  loadDemo() { return this.mutate(() => ({ ...buildDemoState(), settings: read().settings })) }
  reset() { return this.mutate(() => ({ ...A.createInitialState(), settings: read().settings })) }
  async exportData() { return JSON.stringify(read(), null, 2) }
}
