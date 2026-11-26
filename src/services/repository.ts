import type { AppSettings, AppState, DraftSetup, Journey, MemberId, Reveal } from '@/domain/types'

export type Unsubscribe = () => void

export interface SheetSyncConfig {
  spreadsheetId: string
  appsScriptUrl: string
  passcode: string
  isStaticHost: boolean
  needsAppsScript: boolean
  lastSyncedAt: string | null
  lastError: string | null
  syncing: boolean
}

/**
 * Persistence boundary. The UI only talks to this interface.
 * LocalRepository / GoogleSheetsRepository = offline-first localStorage + automatic Google Sheets sync.
 */
export interface Repository {
  readonly kind: 'local' | 'gsheets' | 'supabase'
  load(): Promise<AppState>
  /** Realtime: called when another device/tab or Google Sheet changes the data. */
  subscribe(cb: (s: AppState) => void): Unsubscribe
  getSheetConfig(): SheetSyncConfig
  setSheetConfig(patch: Partial<Pick<SheetSyncConfig, 'spreadsheetId' | 'appsScriptUrl' | 'passcode'>>): void
  syncWithSheet(direction?: 'push' | 'pull'): Promise<AppState>

  saveDraft(draft: DraftSetup | null): Promise<AppState>
  saveJourney(journey: Journey): Promise<AppState>
  updateJourney(patch: Partial<Journey>): Promise<AppState>
  /** Idempotent. Returns the stored reveal; never rerolls. */
  revealToday(by: MemberId): Promise<{ state: AppState; reveal: Reveal; created: boolean }>
  resetTodayReveal(): Promise<AppState>
  confirmContribution(id: string): Promise<AppState>
  addContribution(member: MemberId, amount: number, notes: string): Promise<AppState>
  voidContribution(id: string): Promise<AppState>
  startChallenge(id: string): Promise<AppState>
  addCustomChallenge(title: string, target: number): Promise<AppState>
  markNotificationsRead(): Promise<AppState>
  updateSettings(patch: Partial<AppSettings>): Promise<AppState>
  regenerateInvite(): Promise<AppState>
  loadDemo(): Promise<AppState>
  reset(): Promise<AppState>
  exportData(): Promise<string>
}
