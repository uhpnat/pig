import { confirmContribution, createInitialState, revealToday, saveJourney } from './actions'
import { addDays, todayIn, TZ_DEFAULT } from './format'
import { seededRand } from './engine'
import type { AppState, Journey } from './types'

export function defaultJourney(today = todayIn()): Journey {
  return {
    id: 'journey_demo',
    name: 'Heo Nhà Mình',
    startDate: today,
    months: 12,
    endDate: today,
    timezone: TZ_DEFAULT,
    goal: 100_000_000,
    fairness: 'proportional',
    customPctA: 50,
    savingsPct: null,
    monthlyBudgetOverride: null,
    dailyMin: 20_000,
    dailyMax: null,
    requireConfirmation: true,
    revealEnabled: true,
    members: {
      a: { id: 'a', name: 'Phú', avatar: 'img:boy', income: 20_000_000, role: 'owner', joinedAt: today },
      b: { id: 'b', name: 'Mai', avatar: 'img:girl', income: 10_000_000, role: 'member', joinedAt: today },
    },
    pig: { name: 'Heo Nhà Mình', style: 'crown', color: '#ffb3c1', background: 'sky' },
    setupDone: false,
    createdAt: new Date().toISOString(),
  }
}

/** Demo data built by replaying real engine operations over the past days. */
export function buildDemoState(today = todayIn(), days = 14): AppState {
  let s = createInitialState()
  const start = addDays(today, -days)
  const j = { ...defaultJourney(start), setupDone: true, startDate: start, createdAt: `${start}T08:00:00+07:00` }
  s = saveJourney(s, j, `${start}T08:00:00+07:00`)
  const rand = seededRand(2026)
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i)
    if (i === 3 || i === 8) continue // skipped days: the engine re-spreads the budget
    const at = `${date}T09:00:00+07:00`
    const out = revealToday(s, date, i % 2 ? 'b' : 'a', rand, at)
    s = out.state
    const cs = s.contributions.filter((c) => c.revealId === out.reveal.id)
    const last = i === days - 1
    for (const c of cs) {
      if (last && c.member === 'b') continue // leave one pending to show the state
      s = confirmContribution(s, c.id, `${date}T20:${c.member === 'a' ? '05' : '30'}:00+07:00`)
    }
  }
  return s
}
