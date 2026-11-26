import { addDays, diffDays, fmtDate, monthKeyOf, weekStart } from './format'
import type { Contribution, Journey, MemberId, Reveal } from './types'

export const MILESTONES = [10, 25, 50, 75, 100] as const

export function confirmedTotals(cs: Contribution[]): Record<MemberId, number> & { total: number } {
  const t = { a: 0, b: 0, total: 0 }
  for (const c of cs) if (c.status === 'confirmed') { t[c.member] += c.amount; t.total += c.amount }
  return t
}

export function pendingTotals(cs: Contribution[]): Record<MemberId, number> & { total: number } {
  const t = { a: 0, b: 0, total: 0 }
  for (const c of cs) if (c.status === 'pending') { t[c.member] += c.amount; t.total += c.amount }
  return t
}

export const progressPct = (j: Journey, cs: Contribution[]) => Math.min(100, (confirmedTotals(cs).total / Math.max(1, j.goal)) * 100)

/** Actual accumulated contribution ratio (separate from income % and planned %). */
export function actualShares(cs: Contribution[]): Record<MemberId, number> {
  const t = confirmedTotals(cs)
  return t.total > 0 ? { a: t.a / t.total, b: t.b / t.total } : { a: 0, b: 0 }
}

export type PigStage = 'newborn' | 'happy' | 'chubby' | 'accessories' | 'golden' | 'celebration'

export function pigStage(p: number): { stage: PigStage; label: string; index: number } {
  if (p >= 100) return { stage: 'celebration', label: 'Kho báu! 🎆', index: 5 }
  if (p >= 75) return { stage: 'golden', label: 'Heo vàng lấp lánh ✨', index: 4 }
  if (p >= 50) return { stage: 'accessories', label: 'Heo diện phụ kiện', index: 3 }
  if (p >= 25) return { stage: 'chubby', label: 'Heo mũm mĩm', index: 2 }
  if (p >= 10) return { stage: 'happy', label: 'Heo con vui vẻ', index: 1 }
  return { stage: 'newborn', label: 'Heo con mới sinh', index: 0 }
}

export interface Eta {
  days: number
  date: string
}

/** Estimate based on confirmed savings only. Returns null when there is not enough data. */
export function estimateCompletion(j: Journey, cs: Contribution[], today: string): Eta | null {
  const saved = confirmedTotals(cs).total
  if (saved <= 0) return null
  if (saved >= j.goal) return { days: 0, date: today }
  const elapsed = Math.max(1, diffDays(j.startDate, today) + 1)
  const perDay = saved / elapsed
  const days = Math.ceil((j.goal - saved) / perDay)
  return { days, date: addDays(today, days) }
}

export function savingDays(cs: Contribution[]): string[] {
  return [...new Set(cs.filter((c) => c.status === 'confirmed').map((c) => c.date))].sort()
}

export function bothConfirmedDays(cs: Contribution[]): string[] {
  const m = new Map<string, Set<MemberId>>()
  for (const c of cs) {
    if (c.status !== 'confirmed') continue
    if (!m.has(c.date)) m.set(c.date, new Set())
    m.get(c.date)!.add(c.member)
  }
  return [...m.entries()].filter(([, s]) => s.size === 2).map(([d]) => d).sort()
}

/** Consecutive days with at least one confirmed contribution, ending today or yesterday. Missing a day is never punished beyond resetting. */
export function currentStreak(cs: Contribution[], today: string): number {
  const days = new Set(savingDays(cs))
  let cursor = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(cursor)) { n++; cursor = addDays(cursor, -1) }
  return n
}

export function bestStreak(cs: Contribution[]): number {
  const days = savingDays(cs)
  let best = 0, run = 0, prev: string | null = null
  for (const d of days) { run = prev && diffDays(prev, d) === 1 ? run + 1 : 1; prev = d; best = Math.max(best, run) }
  return best
}

export type Period = '1m' | '3m' | '6m' | '1y' | 'all'
export const PERIOD_LABEL: Record<Period, string> = { '1m': '1 tháng', '3m': '3 tháng', '6m': '6 tháng', '1y': '1 năm', all: 'Tất cả' }

export function periodStart(p: Period, today: string): string | null {
  const d = { '1m': 30, '3m': 91, '6m': 182, '1y': 365, all: 0 }[p]
  return d ? addDays(today, -d) : null
}

export function inPeriod<T extends { date: string }>(items: T[], p: Period, today: string): T[] {
  const s = periodStart(p, today)
  return s ? items.filter((i) => i.date >= s) : items
}

export interface SeriesPoint { label: string; a: number; b: number; total: number }

function bucket(cs: Contribution[], keyOf: (d: string) => string, labelOf: (k: string) => string): SeriesPoint[] {
  const m = new Map<string, SeriesPoint>()
  for (const c of cs.filter((x) => x.status === 'confirmed').sort((x, y) => x.date.localeCompare(y.date))) {
    const k = keyOf(c.date)
    if (!m.has(k)) m.set(k, { label: labelOf(k), a: 0, b: 0, total: 0 })
    const p = m.get(k)!
    p[c.member] += c.amount
    p.total += c.amount
  }
  return [...m.values()]
}

export const monthlySeries = (cs: Contribution[]) => bucket(cs, monthKeyOf, (k) => `T${k.slice(5)}/${k.slice(2, 4)}`)
export const weeklySeries = (cs: Contribution[]) => bucket(cs, weekStart, (k) => fmtDate(k).slice(0, 5))

export function dailySeries(reveals: Reveal[]): SeriesPoint[] {
  return [...reveals].sort((x, y) => x.date.localeCompare(y.date)).map((r) => ({ label: fmtDate(r.date).slice(0, 5), a: r.amounts.a, b: r.amounts.b, total: r.amounts.a + r.amounts.b }))
}

export function cumulativeSeries(cs: Contribution[]): { label: string; total: number }[] {
  let run = 0
  return savingDays(cs).map((d) => {
    run += cs.filter((c) => c.status === 'confirmed' && c.date === d).reduce((s, c) => s + c.amount, 0)
    return { label: fmtDate(d).slice(0, 5), total: run }
  })
}

export function sumBetween(cs: Contribution[], from: string, to: string): number {
  return cs.filter((c) => c.status === 'confirmed' && c.date >= from && c.date <= to).reduce((s, c) => s + c.amount, 0)
}
