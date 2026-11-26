export type MemberId = 'a' | 'b'
export const MEMBER_IDS: MemberId[] = ['a', 'b']

export type FairnessMode = 'proportional' | 'equal' | 'custom'

export type Gender = 'male' | 'female'

export interface Member {
  id: MemberId
  name: string
  /** emoji, `img:<key>` (bundled asset) or http/data URL */
  avatar: string
  income: number
  role: 'owner' | 'member'
  gender?: Gender
  joinedAt: string
}

export type PigStyle = 'baby' | 'round' | 'glasses' | 'crown' | 'hat' | 'hoodie'
export type PigBackground = 'sky' | 'garden' | 'sunset' | 'night'

export interface PigConfig {
  name: string
  style: PigStyle
  color: string
  background: PigBackground
}

export interface Journey {
  id: string
  name: string
  startDate: string // yyyy-mm-dd
  months: number
  endDate: string
  timezone: string
  goal: number
  fairness: FairnessMode
  /** share (%) of member A when fairness === 'custom' */
  customPctA: number
  /** optional: % of combined income to save monthly */
  savingsPct: number | null
  /** optional explicit monthly target (overrides savingsPct and goal/months) */
  monthlyBudgetOverride: number | null
  /** combined daily bounds (split per member by planned share) */
  dailyMin: number
  dailyMax: number | null
  requireConfirmation: boolean
  revealEnabled: boolean
  members: Record<MemberId, Member>
  pig: PigConfig
  setupDone: boolean
  createdAt: string
}

export interface RevealMetadata {
  algorithm: string
  source: 'local-demo' | 'server'
  daysLeft: number
  remaining: Record<MemberId, number>
  bounds: Record<MemberId, [number, number]>
  monthBudget: Record<MemberId, number>
}

export interface Reveal {
  id: string
  date: string
  initiatedBy: MemberId
  status: 'revealed'
  amounts: Record<MemberId, number>
  metadata: RevealMetadata
  createdAt: string
}

export type ContributionStatus = 'pending' | 'confirmed' | 'voided'

export interface Contribution {
  id: string
  member: MemberId
  revealId: string | null
  amount: number
  date: string
  status: ContributionStatus
  notes: string
  createdAt: string
  confirmedAt: string | null
  /** Both 'a' and 'b' must confirm a contribution before status becomes 'confirmed'. */
  confirmedBy?: MemberId[]
}

export type ActivityType = 'reveal' | 'contribution' | 'confirmation' | 'milestone' | 'challenge' | 'settings' | 'system'

export interface Activity {
  id: string
  at: string
  type: ActivityType
  member?: MemberId
  amount?: number
  title: string
  description?: string
  status?: 'pending' | 'done'
  /** audit trail for settings changes */
  audit?: { old: Record<string, unknown>; next: Record<string, unknown> }
}

export type NotificationType = 'reveal' | 'partner_confirmed' | 'pending' | 'milestone' | 'challenge' | 'recap' | 'goal' | 'invite'

export interface AppNotification {
  id: string
  at: string
  type: NotificationType
  title: string
  message: string
  read: boolean
}

export interface CustomChallenge {
  id: string
  title: string
  targetAmount: number
}

export interface AppSettings {
  sound: boolean
  haptics: boolean
  animations: 'auto' | 'off'
  theme: 'light' | 'dark' | 'auto'
  notifyReveal: boolean
  notifyPartner: boolean
  notifyRecap: boolean
}

export interface DraftSetup {
  step: number
  values: Record<string, unknown>
}

export interface AppState {
  version: 1
  journey: Journey | null
  draft: DraftSetup | null
  reveals: Reveal[]
  contributions: Contribution[]
  activity: Activity[]
  notifications: AppNotification[]
  challengeStatus: Record<string, 'active' | 'completed'>
  completedAt: Record<string, string>
  customChallenges: CustomChallenge[]
  milestonesReached: number[]
  settings: AppSettings
  invite: { code: string; expiresAt: string } | null
}

export type DomainErrorCode =
  | 'NO_JOURNEY'
  | 'GOAL_REACHED'
  | 'REVEAL_DISABLED'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'OUT_OF_RANGE'
  | 'ALREADY_CONFIRMED'

export class DomainError extends Error {
  code: DomainErrorCode
  constructor(code: DomainErrorCode, message: string) {
    super(message)
    this.code = code
  }
}
