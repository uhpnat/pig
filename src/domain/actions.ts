import { allChallenges } from './challenges'
import { committedTotal, generateDailyAmounts, plannedShares } from './engine'
import { addMonths, fmtDate, todayIn, uid, vnd } from './format'
import { MILESTONES, progressPct, confirmedTotals } from './stats'
import {
  DomainError,
  type Activity,
  type AppNotification,
  type AppSettings,
  type AppState,
  type Contribution,
  type Journey,
  type MemberId,
  type NotificationType,
  type Reveal,
} from './types'

export const DEFAULT_SETTINGS: AppSettings = {
  sound: false,
  haptics: true,
  animations: 'auto',
  theme: 'light',
  notifyReveal: true,
  notifyPartner: true,
  notifyRecap: true,
}

export function createInitialState(): AppState {
  return {
    version: 1,
    journey: null,
    draft: null,
    reveals: [],
    contributions: [],
    activity: [],
    notifications: [],
    challengeStatus: {},
    completedAt: {},
    customChallenges: [],
    milestonesReached: [],
    messages: [],
    settings: { ...DEFAULT_SETTINGS },
    invite: null,
  }
}

const clone = <T,>(v: T): T => structuredClone(v)

function pushActivity(s: AppState, a: Omit<Activity, 'id'>) {
  s.activity.unshift({ id: uid('act'), ...a })
}

function pushNotification(
  s: AppState,
  type: NotificationType,
  title: string,
  message: string,
  at: string,
  actor?: MemberId,
) {
  const n: AppNotification = { id: uid('ntf'), at, type, title, message, read: false, ...(actor ? { actor } : {}) }
  s.notifications.unshift(n)
}

export function requireJourney(s: AppState): Journey {
  if (!s.journey || !s.journey.setupDone) throw new DomainError('NO_JOURNEY', 'Chưa có hành trình tiết kiệm.')
  return s.journey
}

export function isGoalReached(s: AppState): boolean {
  return !!s.journey && committedTotal(s.contributions) >= s.journey.goal
}

export function endDateOf(startDate: string, months: number) {
  return addMonths(startDate, months)
}

/** After any confirmation: milestones, challenges and goal state. */
function afterConfirmation(s: AppState, at: string) {
  const j = s.journey
  if (!j) return
  const p = progressPct(j, s.contributions)
  for (const m of MILESTONES) {
    if (p >= m && !s.milestonesReached.includes(m)) {
      s.milestonesReached.push(m)
      pushActivity(s, { at, type: 'milestone', title: m === 100 ? '🎆 Đã đạt mục tiêu!' : `🎉 Đạt ${m}% mục tiêu`, description: `Heo đã có ${vnd(confirmedTotals(s.contributions).total)} đã xác nhận.`, status: 'done' })
      pushNotification(s, m === 100 ? 'goal' : 'milestone', m === 100 ? 'Hoàn thành mục tiêu! 🎆' : `Mốc ${m}% 🎉`, 'Heo đang ăn mừng cùng hai bạn!', at)
    }
  }
  const today = todayIn(j.timezone, new Date(at))
  for (const def of allChallenges(s)) {
    if (s.challengeStatus[def.id] === 'active' && def.value(s, today) >= def.target) completeChallenge(s, def.id, def.title, def.reward.label, at)
  }
}

function completeChallenge(s: AppState, id: string, title: string, reward: string, at: string) {
  s.challengeStatus[id] = 'completed'
  s.completedAt[id] = at
  pushActivity(s, { at, type: 'challenge', title: `🏅 Hoàn thành: ${title}`, description: `Phần thưởng: ${reward}`, status: 'done' })
  pushNotification(s, 'challenge', 'Hoàn thành thử thách!', `${title} – nhận ${reward}`, at)
}

export function saveJourney(state: AppState, journey: Journey, now = new Date().toISOString()): AppState {
  const s = clone(state)
  const first = !s.journey || !s.journey.setupDone
  s.journey = { ...journey, endDate: endDateOf(journey.startDate, journey.months) }
  s.draft = null
  if (first && s.journey.setupDone) {
    pushActivity(s, { at: now, type: 'system', title: `🌱 Bắt đầu hành trình “${journey.name}”`, status: 'done' })
    s.invite = s.invite ?? { code: Math.random().toString(36).slice(2, 8).toUpperCase(), expiresAt: new Date(Date.parse(now) + 7 * 864e5).toISOString() }
    pushNotification(s, 'invite', 'Mời người ấy tham gia', 'Chia sẻ mã mời trong tab “Của chúng mình” để chơi trên hai thiết bị.', now)
  }
  return s
}

export interface UpdateOptions { reason?: string }

/** Updates shared rules and records an audit entry (old → new). Confirmed transactions are never modified. */
export function updateJourney(state: AppState, patch: Partial<Journey>, now = new Date().toISOString()): AppState {
  const s = clone(state)
  const j = requireJourney(s)
  const old: Record<string, unknown> = {}
  const next: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    const ov = (j as unknown as Record<string, unknown>)[k]
    if (JSON.stringify(ov) !== JSON.stringify(v)) { old[k] = ov; next[k] = v }
  }
  if (!Object.keys(next).length) return state
  s.journey = { ...j, ...patch }
  s.journey.endDate = endDateOf(s.journey.startDate, s.journey.months)
  const changedKeys = Object.keys(next)
  const isSilentMemberSync =
    changedKeys.length === 1 &&
    changedKeys[0] === 'members' &&
    j.members.a.name === s.journey.members.a.name &&
    j.members.b.name === s.journey.members.b.name &&
    j.members.a.income === s.journey.members.a.income &&
    j.members.b.income === s.journey.members.b.income &&
    j.members.a.gender === s.journey.members.a.gender &&
    j.members.b.gender === s.journey.members.b.gender
  if (!isSilentMemberSync) {
    pushActivity(s, { at: now, type: 'settings', title: '⚙️ Đã cập nhật quy tắc chung', description: `Thay đổi: ${changedKeys.join(', ')}. Các giao dịch đã xác nhận được giữ nguyên.`, status: 'done', audit: { old, next } })
    if (!('pig' in next && changedKeys.length === 1)) {
      pushNotification(s, 'recap', '⚙️ Quy tắc chung vừa được cập nhật', `Mục thay đổi: ${changedKeys.join(', ')}`, now)
    }
  }
  return s
}

export interface RevealOutcome { state: AppState; reveal: Reveal; created: boolean }

/**
 * Idempotent: at most one reveal per journey per date. If it already exists it is returned unchanged.
 * (Server implementation: SQL function `reveal_today` with a unique (journey_id, reveal_date) constraint.)
 */
export function revealToday(state: AppState, date: string, by: MemberId, rand: () => number, now = new Date().toISOString()): RevealOutcome {
  const j = requireJourney(state)
  const existing = state.reveals.find((r) => r.date === date)
  if (existing) return { state, reveal: existing, created: false }
  if (!j.revealEnabled) throw new DomainError('REVEAL_DISABLED', 'Tính năng mở số tiền hàng ngày đang tắt.')
  if (isGoalReached(state)) throw new DomainError('GOAL_REACHED', 'Mục tiêu đã hoàn thành, không cần mở thêm nữa.')

  const s = clone(state)
  const { amounts, metadata } = generateDailyAmounts({ journey: j, date, reveals: s.reveals, contributions: s.contributions, rand })
  const reveal: Reveal = { id: uid('rv'), date, initiatedBy: by, status: 'revealed', amounts, metadata, createdAt: now }
  s.reveals.push(reveal)
  const names = j.members
  pushActivity(s, { at: now, type: 'reveal', member: by, amount: amounts.a + amounts.b, title: '🐷 Kết quả tiết kiệm hôm nay', description: `${names.a.name}: +${vnd(amounts.a)} · ${names.b.name}: +${vnd(amounts.b)}`, status: 'done' })
  for (const k of ['a', 'b'] as MemberId[]) {
    if (amounts[k] <= 0) continue
    const c: Contribution = {
      id: `ct_${reveal.id}_${k}`,
      member: k,
      revealId: reveal.id,
      amount: amounts[k],
      date,
      status: j.requireConfirmation ? 'pending' : 'confirmed',
      notes: '',
      createdAt: now,
      confirmedAt: j.requireConfirmation ? null : now,
      confirmedBy: j.requireConfirmation ? [] : ['a', 'b'],
    }
    s.contributions.push(c)
  }
  const other: MemberId = by === 'a' ? 'b' : 'a'
  pushNotification(s, 'reveal', `${names[by].name} vừa mở số tiền hôm nay`, `${names[other].name} cần nạp +${vnd(amounts[other])} vào quỹ hôm nay nhé!`, now, by)
  if (!j.requireConfirmation) afterConfirmation(s, now)
  return { state: s, reveal, created: true }
}

export function confirmContribution(
  state: AppState,
  contributionId: string,
  now = new Date().toISOString(),
  byMember?: MemberId,
): AppState {
  const c0 = state.contributions.find((c) => c.id === contributionId)
  if (!c0) throw new DomainError('NOT_FOUND', 'Không tìm thấy khoản góp.')
  if (c0.status !== 'pending') return state // idempotent
  const existingBy = c0.confirmedBy ?? []
  if (byMember && existingBy.includes(byMember)) return state // already confirmed by this member

  const s = clone(state)
  const j = requireJourney(s)
  const c = s.contributions.find((x) => x.id === contributionId)!
  const ownerName = j.members[c.member].name

  // Legacy / unit-test call without byMember -> confirm immediately by both
  if (!byMember) {
    c.confirmedBy = ['a', 'b']
    c.status = 'confirmed'
    c.confirmedAt = now
    pushActivity(s, { at: now, type: 'confirmation', member: c.member, amount: c.amount, title: `💰 ${ownerName} đã xác nhận góp`, description: c.notes || (c.revealId ? 'Khoản góp từ kết quả mở số' : 'Khoản nạp thêm'), status: 'done' })
    pushNotification(s, 'partner_confirmed', `${ownerName} đã xác nhận ${vnd(c.amount)}`, 'Heo cảm ơn bạn! 🐷', now)
    afterConfirmation(s, now)
    return s
  }

  const nextBy = Array.from(new Set([...(c.confirmedBy ?? []), byMember]))
  c.confirmedBy = nextBy
  const bothDone = nextBy.includes('a') && nextBy.includes('b')
  const actorName = j.members[byMember].name
  const otherId: MemberId = byMember === 'a' ? 'b' : 'a'
  const otherName = j.members[otherId].name

  if (!bothDone) {
    // Step 1 of 2: One person confirmed, waiting for the other person to cross-confirm!
    const isOwner = byMember === c.member
    const actTitle = isOwner
      ? `⏳ ${ownerName} báo đã nạp ${vnd(c.amount)} (1/2)`
      : `⏳ ${actorName} đã xác nhận cho ${ownerName} (1/2)`
    const actDesc = isOwner
      ? `Đang chờ ${otherName} kiểm tra và xác nhận chéo để duyệt vào quỹ.`
      : `Đang chờ ${ownerName} bấm xác nhận đã nạp.`
    pushActivity(s, { at: now, type: 'confirmation', member: byMember, amount: c.amount, title: actTitle, description: actDesc, status: 'pending' })
    pushNotification(
      s,
      'pending',
      isOwner ? `⏳ ${ownerName} vừa nạp ${vnd(c.amount)} vào quỹ` : `⏳ ${actorName} đã duyệt khoản của ${ownerName}`,
      isOwner ? `${otherName} ơi, vào kiểm tra và bấm xác nhận chéo cho ${ownerName} nhé! (1/2)` : `${ownerName} nhớ bấm xác nhận đã nạp nhé! (1/2)`,
      now,
      byMember,
    )
    return s
  }

  // Step 2 of 2: Both people have confirmed! Officially approved into the fund!
  c.status = 'confirmed'
  c.confirmedAt = now
  pushActivity(s, {
    at: now,
    type: 'confirmation',
    member: c.member,
    amount: c.amount,
    title: `💰 Đã duyệt khoản ${vnd(c.amount)} của ${ownerName} (2/2 ✅)`,
    description: `${j.members.a.name} & ${j.members.b.name} đã xác nhận chéo hoàn tất.`,
    status: 'done',
  })
  pushNotification(
    s,
    'partner_confirmed',
    `💰 Đã duyệt ${vnd(c.amount)} của ${ownerName} vào heo!`,
    `Cả ${j.members.a.name} & ${j.members.b.name} đã xác nhận (2/2). Heo cảm ơn hai bạn! 🐷`,
    now,
    byMember,
  )
  if (c.revealId) {
    const mates = s.contributions.filter((x) => x.revealId === c.revealId)
    if (mates.length > 1 && mates.every((x) => x.status === 'confirmed')) {
      pushActivity(s, { at: now, type: 'confirmation', title: '🎉 Cả hai đã duyệt xong quỹ hôm nay', description: `Tổng ${vnd(mates.reduce((t, x) => t + x.amount, 0))} đã được cộng vào heo.`, status: 'done' })
    }
  }
  afterConfirmation(s, now)
  return s
}

export function addContribution(state: AppState, member: MemberId, amount: number, notes: string, date: string, now = new Date().toISOString()): AppState {
  const j = requireJourney(state)
  if (!Number.isFinite(amount) || amount <= 0) throw new DomainError('INVALID', 'Số tiền phải lớn hơn 0.')
  const remaining = j.goal - committedTotal(state.contributions)
  if (remaining <= 0) throw new DomainError('GOAL_REACHED', 'Mục tiêu đã hoàn thành.')
  if (amount > remaining) throw new DomainError('OUT_OF_RANGE', `Chỉ còn thiếu ${vnd(remaining)} để đạt mục tiêu.`)
  const s = clone(state)
  const pending = j.requireConfirmation
  const otherId: MemberId = member === 'a' ? 'b' : 'a'
  const c: Contribution = {
    id: uid('ct'),
    member,
    revealId: null,
    amount: Math.round(amount),
    date,
    status: pending ? 'pending' : 'confirmed',
    notes: notes.trim(),
    createdAt: now,
    confirmedAt: pending ? null : now,
    confirmedBy: pending ? [member] : ['a', 'b'],
  }
  s.contributions.push(c)
  pushActivity(s, { at: now, type: 'contribution', member, amount: c.amount, title: `➕ ${j.members[member].name} nạp thêm (1/2)`, description: c.notes ? `${c.notes} · Chờ ${j.members[otherId].name} xác nhận` : `Chờ ${j.members[otherId].name} xác nhận chéo`, status: pending ? 'pending' : 'done' })
  pushNotification(
    s,
    pending ? 'pending' : 'partner_confirmed',
    `➕ ${j.members[member].name} vừa nạp thêm ${vnd(c.amount)}`,
    pending ? `Chờ ${j.members[otherId].name} xác nhận chéo (1/2) để duyệt vào heo đất.` : 'Đã cộng thẳng vào heo đất! 🐷',
    now,
    member,
  )
  if (!pending) afterConfirmation(s, now)
  return s
}

/** Never delete: a mistaken pending contribution can be voided, which is logged. */
export function voidContribution(state: AppState, id: string, now = new Date().toISOString()): AppState {
  const c0 = state.contributions.find((c) => c.id === id)
  if (!c0 || c0.status !== 'pending') throw new DomainError('INVALID', 'Chỉ có thể huỷ khoản đang chờ xác nhận.')
  const s = clone(state)
  s.contributions.find((c) => c.id === id)!.status = 'voided'
  pushActivity(s, { at: now, type: 'contribution', member: c0.member, amount: c0.amount, title: '↩️ Đã huỷ khoản chờ xác nhận', description: 'Bản ghi được giữ lại trong nhật ký.', status: 'done' })
  return s
}

export function startChallenge(state: AppState, id: string, now = new Date().toISOString()): AppState {
  const def = allChallenges(state).find((c) => c.id === id)
  if (!def) throw new DomainError('NOT_FOUND', 'Không tìm thấy thử thách.')
  if (state.challengeStatus[id]) return state
  const s = clone(state)
  s.challengeStatus[id] = 'active'
  pushActivity(s, { at: now, type: 'challenge', title: `🚀 Bắt đầu thử thách: ${def.title}`, status: 'pending' })
  const today = s.journey ? todayIn(s.journey.timezone, new Date(now)) : todayIn()
  if (def.value(s, today) >= def.target) completeChallenge(s, id, def.title, def.reward.label, now)
  return s
}

export function addCustomChallenge(state: AppState, title: string, targetAmount: number, now = new Date().toISOString()): AppState {
  if (!title.trim() || targetAmount <= 0) throw new DomainError('INVALID', 'Nhập tên và số tiền mục tiêu hợp lệ.')
  const s = clone(state)
  s.customChallenges.push({ id: uid('cc'), title: title.trim(), targetAmount: Math.round(targetAmount) })
  pushActivity(s, { at: now, type: 'challenge', title: `✏️ Tạo thử thách: ${title.trim()}`, status: 'pending' })
  return s
}

export function markNotificationsRead(state: AppState): AppState {
  const s = clone(state)
  s.notifications.forEach((n) => (n.read = true))
  return s
}

export function updateSettings(state: AppState, patch: Partial<AppSettings>): AppState {
  return { ...clone(state), settings: { ...state.settings, ...patch } }
}

export function saveDraft(state: AppState, draft: AppState['draft']): AppState {
  return { ...clone(state), draft }
}

export function regenerateInvite(state: AppState, now = new Date().toISOString()): AppState {
  const s = clone(state)
  s.invite = { code: Math.random().toString(36).slice(2, 8).toUpperCase(), expiresAt: new Date(Date.parse(now) + 7 * 864e5).toISOString() }
  return s
}

/** Resets today's daily reveal & its linked contributions so the couple can re-roll today if needed. */
export function resetTodayReveal(state: AppState, date: string, now = new Date().toISOString()): AppState {
  const s = clone(state)
  const reveals = s.reveals.filter((r) => r.date === date)
  if (!reveals.length) return state
  const removedIds = new Set(reveals.map((r) => r.id))
  const hasConfirmed = s.contributions.some((c) => c.revealId && removedIds.has(c.revealId) && c.status === 'confirmed')
  if (hasConfirmed) {
    throw new DomainError('ALREADY_CONFIRMED', 'Đã có người xác nhận bỏ heo hôm nay, không thể quay lại nữa.')
  }
  s.reveals = s.reveals.filter((r) => r.date !== date)
  s.contributions = s.contributions.filter((c) => !(c.revealId && removedIds.has(c.revealId)))
  pushActivity(s, { at: now, type: 'system', title: `🔄 Đã đặt lại lượt mở số ngày ${fmtDate(date)}`, status: 'done' })
  return s
}

/**
 * Clears all savings transactions (reveals, contributions, activity, challenges, milestones, notifications)
 * while preserving the initial journey configuration (journey name, goal, duration, members, incomes, avatars, pig config, settings).
 */
export function clearSavingsDataKeepConfig(state: AppState, now = new Date().toISOString()): AppState {
  const s = clone(state)
  s.reveals = []
  s.contributions = []
  s.activity = []
  s.notifications = []
  s.challengeStatus = {}
  s.completedAt = {}
  s.milestonesReached = []
  s.messages = []
  if (s.journey) {
    pushActivity(s, {
      at: now,
      type: 'system',
      title: `🌱 Đã làm mới toàn bộ dữ liệu tiết kiệm của “${s.journey.name}” (giữ nguyên cấu hình ban đầu)`,
      status: 'done',
    })
  }
  return s
}

export function sendChatMessage(
  state: AppState,
  sender: MemberId,
  text: string,
  now = new Date().toISOString(),
): AppState {
  const j = requireJourney(state)
  const clean = text.trim()
  if (!clean) throw new DomainError('INVALID', 'Hãy nhập nội dung tin nhắn nhé.')
  const s = clone(state)
  const list = s.messages ?? []
  list.push({
    id: uid('msg'),
    sender,
    text: clean.slice(0, 300),
    at: now,
    readBy: [sender],
  })
  s.messages = list.slice(-80)
  pushNotification(
    s,
    'chat',
    `💬 ${j.members[sender].name} nhắn tin`,
    clean.slice(0, 120),
    now,
    sender,
  )
  return s
}

export function markChatRead(state: AppState, by: MemberId): AppState {
  const s = clone(state)
  let changed = false
  for (const m of s.messages ?? []) {
    const rb = m.readBy ?? [m.sender]
    if (!rb.includes(by)) {
      m.readBy = [...rb, by]
      changed = true
    }
  }
  for (const n of s.notifications) {
    if (n.type === 'chat' && !n.read) {
      n.read = true
      changed = true
    }
  }
  return changed ? s : state
}

export { plannedShares, fmtDate }
