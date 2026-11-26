import { describe, expect, it } from 'vitest'
import { confirmContribution, createInitialState, revealToday, saveJourney, addContribution, resetTodayReveal } from './actions'
import { generateDailyAmounts, monthlyBudget, plannedShares, previewPlan, seededRand } from './engine'
import { defaultJourney, buildDemoState } from './seed'
import { confirmedTotals, currentStreak, progressPct } from './stats'
import { addDays } from './format'

const J = () => ({ ...defaultJourney('2026-03-01'), setupDone: true })

describe('plan', () => {
  it('splits proportional to income', () => {
    const s = plannedShares(J())
    expect(s.a).toBeCloseTo(0.6667, 3)
    expect(s.b).toBeCloseTo(0.3333, 3)
  })
  it('equal and custom modes', () => {
    expect(plannedShares({ ...J(), fairness: 'equal' }).a).toBe(0.5)
    expect(plannedShares({ ...J(), fairness: 'custom', customPctA: 30 }).b).toBeCloseTo(0.7)
  })
  it('budget priority: override > pct > goal/months', () => {
    expect(monthlyBudget(J())).toBe(Math.round(100_000_000 / 12))
    expect(monthlyBudget({ ...J(), savingsPct: 10 })).toBe(3_000_000)
    expect(monthlyBudget({ ...J(), savingsPct: 10, monthlyBudgetOverride: 5_000_000 })).toBe(5_000_000)
  })
  it('flags insufficient budgets', () => {
    expect(previewPlan({ ...J(), monthlyBudgetOverride: 1_000_000 }).feasibility).toBe('short')
  })
})

describe('daily engine', () => {
  it('never exceeds monthly budget, never negative, even over many seeds', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const j = { ...J(), monthlyBudgetOverride: 3_000_000 }
      const rand = seededRand(seed)
      let s = saveJourney(createInitialState(), j)
      const used = { a: 0, b: 0 }
      for (let d = 0; d < 31; d++) {
        const date = addDays('2026-03-01', d)
        const r = generateDailyAmounts({ journey: s.journey!, date, reveals: s.reveals, contributions: s.contributions, rand })
        expect(r.amounts.a).toBeGreaterThanOrEqual(0)
        expect(r.amounts.b).toBeGreaterThanOrEqual(0)
        s = revealToday(s, date, 'a', rand).state
      }
      for (const r of s.reveals) { used.a += r.amounts.a; used.b += r.amounts.b }
      const budget = plannedShares(j)
      expect(used.a).toBeLessThanOrEqual(Math.round(3_000_000 * budget.a) + 1)
      expect(used.b).toBeLessThanOrEqual(Math.round(3_000_000 * budget.b) + 1)
      // the budget is used up by month end (future days stay feasible)
      expect(used.a + used.b).toBeGreaterThanOrEqual(3_000_000 - 2000)
    }
  })
  it('never pushes total beyond the goal', () => {
    const j = { ...J(), goal: 50_000, months: 1, dailyMin: 0 }
    const rand = seededRand(7)
    let s = saveJourney(createInitialState(), j)
    for (let d = 0; d < 30; d++) { try { s = revealToday(s, addDays('2026-03-01', d), 'a', rand).state } catch { break } }
    expect(s.contributions.reduce((t, c) => t + c.amount, 0)).toBeLessThanOrEqual(50_000)
  })
})

describe('idempotency and confirmation', () => {
  it('returns the same reveal for the same date without creating duplicates', () => {
    let s = saveJourney(createInitialState(), J())
    const r1 = revealToday(s, '2026-03-02', 'a', seededRand(1))
    s = r1.state
    const r2 = revealToday(s, '2026-03-02', 'b', seededRand(99))
    expect(r2.created).toBe(false)
    expect(r2.reveal.amounts).toEqual(r1.reveal.amounts)
    expect(r2.state.reveals).toHaveLength(1)
    expect(r2.state.contributions).toHaveLength(2)
  })
  it('counts only confirmed money when confirmation is required', () => {
    let s = saveJourney(createInitialState(), J())
    s = revealToday(s, '2026-03-02', 'a', seededRand(1)).state
    expect(confirmedTotals(s.contributions).total).toBe(0)
    const a = s.contributions.find((c) => c.member === 'a')!
    s = confirmContribution(s, a.id)
    expect(confirmedTotals(s.contributions).total).toBe(a.amount)
    expect(confirmContribution(s, a.id)).toBe(s) // idempotent
  })
  it('manual top-up validates the amount', () => {
    const s = saveJourney(createInitialState(), J())
    expect(() => addContribution(s, 'a', -5, '', '2026-03-02')).toThrow()
  })
  it('disallows resetting today reveal once at least one person has confirmed', () => {
    let s = saveJourney(createInitialState(), J())
    s = revealToday(s, '2026-03-02', 'a', seededRand(1)).state
    const a = s.contributions.find((c) => c.member === 'a')!
    s = confirmContribution(s, a.id)
    expect(() => resetTodayReveal(s, '2026-03-02')).toThrow(/ALREADY_CONFIRMED|xác nhận/)
  })
})

describe('demo + stats', () => {
  it('seed builds history with progress and streak', async () => {
    const s = buildDemoState('2026-03-20', 14)
    expect(progressPct(s.journey!, s.contributions)).toBeGreaterThan(0)
    expect(s.reveals.length).toBe(12)
    expect(currentStreak(s.contributions, '2026-03-20')).toBeGreaterThanOrEqual(1)
  })
})

