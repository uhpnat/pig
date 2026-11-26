import type { Activity, AppNotification, AppState, Contribution, Reveal } from './types'

/**
 * Merges two AppState snapshots (local & remote) without losing either partner's actions:
 * - Reveals: union by `date` (earliest `createdAt` wins so both partners always see the exact same daily reveal!).
 * - Contributions: union by `id` (or by `revealId + member` for daily reveal contributions);
 *   status transitions are monotonic: `voided` > `confirmed` > `pending`.
 * - Activity & Notifications: union by `id`, sorted newest first.
 * - Challenges & Milestones: union of completed / active statuses.
 */
export function mergeStates(local: AppState, remote: AppState): AppState {
  // Choose the most complete journey config
  const journey =
    remote.journey?.setupDone && !local.journey?.setupDone
      ? remote.journey
      : local.journey?.setupDone && !remote.journey?.setupDone
        ? local.journey
        : remote.journey || local.journey

  // 1. Merge daily reveals by date (earliest createdAt wins — idempotent across two phones!)
  const revealByDate = new Map<string, Reveal>()
  for (const r of [...remote.reveals, ...local.reveals]) {
    const prev = revealByDate.get(r.date)
    if (!prev || r.createdAt < prev.createdAt) {
      revealByDate.set(r.date, r)
    }
  }
  const reveals = [...revealByDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  const canonicalRevealIdByDate = new Map(reveals.map((r) => [r.date, r.id]))

  // 2. Merge contributions
  const rank: Record<Contribution['status'], number> = { pending: 0, confirmed: 1, voided: 2 }
  const contribMap = new Map<string, Contribution>()

  for (const raw of [...remote.contributions, ...local.contributions]) {
    // Normalize daily reveal contributions to the canonical reveal ID for that date
    const canonRevealId = raw.revealId ? (canonicalRevealIdByDate.get(raw.date) ?? raw.revealId) : null
    const canonicalReveal = canonRevealId ? revealByDate.get(raw.date) : null
    const c: Contribution = canonicalReveal
      ? {
          ...raw,
          id: `ct_${canonicalReveal.id}_${raw.member}`,
          revealId: canonicalReveal.id,
          amount: canonicalReveal.amounts[raw.member],
        }
      : raw

    const key = c.revealId ? `rev:${c.date}:${c.member}` : `id:${c.id}`
    const prev = contribMap.get(key)
    if (!prev) {
      contribMap.set(key, c)
    } else {
      const winnerStatus = rank[c.status] >= rank[prev.status] ? c.status : prev.status
      contribMap.set(key, {
        ...prev,
        ...c,
        status: winnerStatus,
        confirmedAt: c.confirmedAt || prev.confirmedAt,
        notes: c.notes || prev.notes,
      })
    }
  }
  const contributions = [...contribMap.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  // 3. Merge activity log (deduplicate by id and by daily reveal date)
  const actMap = new Map<string, Activity>()
  for (const a of [...remote.activity, ...local.activity]) {
    const key = a.type === 'reveal' ? `reveal:${a.at.slice(0, 10)}` : a.id
    if (!actMap.has(key)) actMap.set(key, a)
  }
  const activity = [...actMap.values()].sort((a, b) => b.at.localeCompare(a.at))

  // 4. Merge notifications
  const ntfMap = new Map<string, AppNotification>()
  for (const n of [...remote.notifications, ...local.notifications]) {
    const prev = ntfMap.get(n.id)
    ntfMap.set(n.id, prev ? { ...n, read: prev.read || n.read } : n)
  }
  const notifications = [...ntfMap.values()].sort((a, b) => b.at.localeCompare(a.at))

  // 5. Merge challenges & milestones
  const challengeStatus: AppState['challengeStatus'] = { ...remote.challengeStatus, ...local.challengeStatus }
  for (const k of Object.keys(challengeStatus)) {
    if (remote.challengeStatus[k] === 'completed' || local.challengeStatus[k] === 'completed') {
      challengeStatus[k] = 'completed'
    }
  }
  const completedAt = { ...remote.completedAt, ...local.completedAt }
  const customMap = new Map([...remote.customChallenges, ...local.customChallenges].map((c) => [c.id, c]))
  const milestonesReached = [...new Set([...remote.milestonesReached, ...local.milestonesReached])].sort((a, b) => a - b)

  return {
    version: 1,
    journey,
    draft: local.draft ?? remote.draft,
    reveals,
    contributions,
    activity,
    notifications,
    challengeStatus,
    completedAt,
    customChallenges: [...customMap.values()],
    milestonesReached,
    settings: local.settings,
    invite: remote.invite ?? local.invite,
  }
}
