import { addDays, daysInMonth, diffDays } from './format'
import type { Contribution, Journey, MemberId, Reveal, RevealMetadata } from './types'

export const ROUND_STEP = 1000
export const ALGORITHM = 'bounded-v1'

/** Planned share of the shared savings each member should carry (0..1). */
export function plannedShares(j: Pick<Journey, 'fairness' | 'customPctA' | 'members'>): Record<MemberId, number> {
  const { a, b } = j.members
  let sa = 0.5
  if (j.fairness === 'proportional') {
    const total = a.income + b.income
    sa = total > 0 ? a.income / total : 0.5
  } else if (j.fairness === 'custom') {
    sa = Math.min(0.99, Math.max(0.01, j.customPctA / 100))
  }
  return { a: sa, b: 1 - sa }
}

/** Income percentages (separate metric from planned and actual shares). */
export function incomeShares(j: Pick<Journey, 'members'>): Record<MemberId, number> {
  const total = j.members.a.income + j.members.b.income
  return total > 0 ? { a: j.members.a.income / total, b: j.members.b.income / total } : { a: 0.5, b: 0.5 }
}

export function combinedIncome(j: Pick<Journey, 'members'>): number {
  return j.members.a.income + j.members.b.income
}

/** Shared monthly savings budget. Priority: explicit override > % of income > goal/months. */
export function monthlyBudget(j: Pick<Journey, 'goal' | 'months' | 'savingsPct' | 'monthlyBudgetOverride' | 'members'>): number {
  if (j.monthlyBudgetOverride && j.monthlyBudgetOverride > 0) return Math.round(j.monthlyBudgetOverride)
  if (j.savingsPct && j.savingsPct > 0) return Math.round((combinedIncome(j) * j.savingsPct) / 100)
  return Math.round(j.goal / Math.max(1, j.months))
}

export interface PlanPreview {
  combinedIncome: number
  income: Record<MemberId, number>
  planned: Record<MemberId, number>
  monthlyBudget: number
  memberMonthly: Record<MemberId, number>
  estimatedTotal: number
  avgPerDay: number
  requiredPerDay: number
  /** months needed to hit the goal at the planned budget */
  monthsToGoal: number
  feasibility: 'ok' | 'tight' | 'short' | 'unaffordable'
  feasibilityNote: string
}

export function previewPlan(j: Pick<Journey, 'goal' | 'months' | 'savingsPct' | 'monthlyBudgetOverride' | 'members' | 'fairness' | 'customPctA'>): PlanPreview {
  const income = combinedIncome(j)
  const budget = monthlyBudget(j)
  const planned = plannedShares(j)
  const estimatedTotal = budget * j.months
  const days = Math.max(1, j.months * 30)
  const monthsToGoal = budget > 0 ? j.goal / budget : Infinity
  const requiredMonthly = j.goal / Math.max(1, j.months)
  let feasibility: PlanPreview['feasibility'] = 'ok'
  let note = 'Kế hoạch khả thi với mức thu nhập hiện tại.'
  if (estimatedTotal < j.goal * 0.999) {
    feasibility = 'short'
    note = 'Ngân sách hàng tháng chưa đủ để chạm mục tiêu trong thời gian đã chọn. Hãy tăng ngân sách hoặc kéo dài thời gian.'
  } else if (income > 0 && requiredMonthly > income * 0.5) {
    feasibility = 'unaffordable'
    note = 'Mức cần góp vượt 50% thu nhập chung, khá căng. Hãy cân nhắc kéo dài thời gian nhé.'
  } else if (income > 0 && requiredMonthly > income * 0.35) {
    feasibility = 'tight'
    note = 'Khả thi nhưng khá sát. Hãy giữ nhịp đều mỗi ngày nhé.'
  }
  return {
    combinedIncome: income,
    income: incomeShares(j),
    planned,
    monthlyBudget: budget,
    memberMonthly: { a: Math.round(budget * planned.a), b: Math.round(budget * planned.b) },
    estimatedTotal,
    avgPerDay: budget / 30,
    requiredPerDay: j.goal / days,
    monthsToGoal,
    feasibility,
    feasibilityNote: note,
  }
}

export interface RevealInput {
  journey: Journey
  date: string
  reveals: Reveal[]
  contributions: Contribution[]
  /** uniform random in [0,1); injected so the engine is testable and swappable with server RNG */
  rand: () => number
}

export interface RevealResult {
  amounts: Record<MemberId, number>
  metadata: RevealMetadata
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Total already committed to the goal (confirmed + pending, never voided). */
export function committedTotal(contributions: Contribution[]): number {
  return contributions.filter((c) => c.status !== 'voided').reduce((s, c) => s + c.amount, 0)
}

export function monthRevealed(reveals: Reveal[], date: string): Record<MemberId, number> {
  const month = date.slice(0, 7)
  const out = { a: 0, b: 0 }
  for (const r of reveals) {
    if (r.date.slice(0, 7) === month && r.date !== date) {
      out.a += r.amounts.a
      out.b += r.amounts.b
    }
  }
  return out
}

/**
 * Generates the daily amounts for both members. Guarantees:
 *  - never negative, never above the member's remaining monthly budget,
 *  - never pushes the total over the goal,
 *  - respects combined daily min/max split by planned share,
 *  - keeps future days feasible (remaining budget can still be spread within max),
 *  - skipped days are re-spread automatically (budget / days left),
 *  - confirmed history is never touched.
 */
export function generateDailyAmounts(input: RevealInput): RevealResult {
  const { journey: j, date, reveals, contributions, rand } = input
  const shares = plannedShares(j)
  const budget = monthlyBudget(j)
  const monthBudget = { a: Math.round(budget * shares.a), b: Math.round(budget * shares.b) }
  const used = monthRevealed(reveals, date)

  const goalLeft = Math.max(0, j.goal - committedTotal(contributions))
  const monthDaysLeft = daysInMonth(date) - Number(date.slice(8, 10)) + 1
  const planDaysLeft = diffDays(date, j.endDate) + 1
  const daysLeft = Math.max(1, Math.min(monthDaysLeft, planDaysLeft))

  const amounts = { a: 0, b: 0 }
  const remaining = { a: 0, b: 0 }
  const bounds = { a: [0, 0], b: [0, 0] } as Record<MemberId, [number, number]>

  for (const k of ['a', 'b'] as MemberId[]) {
    const rem = Math.max(0, Math.min(monthBudget[k] - used[k], goalLeft * shares[k]))
    remaining[k] = Math.round(rem)
    const avg = rem / daysLeft
    const lo = Math.min(j.dailyMin * shares[k], rem)
    let hi = (j.dailyMax ? j.dailyMax * shares[k] : Math.max(avg * 2.5, lo))
    hi = Math.max(hi, lo)
    // Feasibility window for the *remaining* days after today.
    const low = Math.max(lo, rem - hi * (daysLeft - 1))
    const up = Math.min(hi, rem - lo * (daysLeft - 1))
    bounds[k] = [Math.round(low), Math.round(Math.max(up, 0))]

    let v: number
    if (rem <= 0) v = 0
    else if (daysLeft === 1) v = Math.min(rem, hi)
    else {
      const sample = avg * (0.4 + 1.2 * rand())
      v = low <= up ? clamp(sample, low, up) : Math.min(rem, hi)
    }
    v = Math.round(v / ROUND_STEP) * ROUND_STEP
    if (rem - v < ROUND_STEP) v = rem // sweep rounding dust
    amounts[k] = Math.max(0, Math.min(Math.round(v), Math.round(rem)))
  }

  // Safety net: the total can never exceed what is left of the goal.
  const total = amounts.a + amounts.b
  if (total > goalLeft) {
    amounts.a = Math.floor((amounts.a * goalLeft) / total)
    amounts.b = Math.floor(goalLeft) - amounts.a
  }

  return {
    amounts,
    metadata: { algorithm: ALGORITHM, source: 'local-demo', daysLeft, remaining, bounds, monthBudget },
  }
}

export function secureRand(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

/** Mulberry32 for deterministic tests / seed data. */
export function seededRand(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export { addDays }

