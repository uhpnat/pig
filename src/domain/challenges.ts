import { addDays, weekStart } from './format'
import { monthlyBudget } from './engine'
import { bestStreak, bothConfirmedDays, confirmedTotals, currentStreak, progressPct, sumBetween } from './stats'
import type { AppState } from './types'

export interface Reward { id: string; label: string; kind: 'accessory' | 'skin' | 'background' | 'decor' | 'badge'; icon: string }

export interface ChallengeDef {
  id: string
  icon: string
  title: string
  description: string
  target: number
  unit: string
  reward: Reward
  value: (s: AppState, today: string) => number
}

const badge = (id: string, label: string, icon = '🏅'): Reward => ({ id, label, kind: 'badge', icon })

export const BASE_CHALLENGES: ChallengeDef[] = [
  { id: 'streak7', icon: '🔥', title: 'Góp 7 ngày liên tiếp', description: 'Mỗi ngày có ít nhất một khoản góp đã xác nhận.', target: 7, unit: 'ngày', reward: { id: 'acc-glasses', label: 'Kính ngầu cho heo', kind: 'accessory', icon: '🕶️' }, value: (s, t) => Math.max(currentStreak(s.contributions, t), 0) },
  { id: 'days30', icon: '📅', title: 'Góp đủ 30 ngày', description: 'Tích lũy 30 ngày có khoản góp (không cần liên tiếp).', target: 30, unit: 'ngày', reward: { id: 'bg-garden', label: 'Nền vườn hoa', kind: 'background', icon: '🌷' }, value: (s) => new Set(s.contributions.filter((c) => c.status === 'confirmed').map((c) => c.date)).size },
  { id: 'both', icon: '👫', title: 'Cùng góp trong một ngày', description: 'Cả hai đều xác nhận khoản góp của cùng một ngày.', target: 1, unit: 'ngày', reward: badge('badge-duo', 'Huy hiệu đôi bạn', '💞'), value: (s) => bothConfirmedDays(s.contributions).length },
  ...[10, 25, 50, 75, 100].map<ChallengeDef>((p) => ({
    id: `pct${p}`, icon: '🎯', title: `Đạt ${p}% mục tiêu`, description: `Tiến độ chung chạm mốc ${p}%.`, target: p, unit: '%',
    reward: p === 100 ? { id: 'decor-treasure', label: 'Rương kho báu', kind: 'decor', icon: '💎' } : badge(`badge-${p}`, `Huy hiệu ${p}%`, p >= 50 ? '🥇' : '🥉'),
    value: (s) => (s.journey ? Math.floor(progressPct(s.journey, s.contributions)) : 0),
  })),
  { id: 'week1m', icon: '🗓️', title: 'Góp 1.000.000đ trong tuần', description: 'Tổng đã xác nhận trong tuần này đạt 1 triệu.', target: 1_000_000, unit: 'đ', reward: { id: 'skin-gold', label: 'Heo da vàng', kind: 'skin', icon: '✨' }, value: (s, t) => sumBetween(s.contributions, weekStart(t), addDays(weekStart(t), 6)) },
  { id: 'month', icon: '🌙', title: 'Thử thách của tháng', description: 'Đủ ngân sách tiết kiệm của tháng này.', target: 100, unit: '%', reward: badge('badge-month', 'Huy hiệu tháng', '🌟'), value: (s, t) => {
      if (!s.journey) return 0
      const b = monthlyBudget(s.journey)
      const m = t.slice(0, 7)
      const got = s.contributions.filter((c) => c.status === 'confirmed' && c.date.startsWith(m)).reduce((x, c) => x + c.amount, 0)
      return Math.min(100, Math.floor((got / Math.max(1, b)) * 100))
    } },
]

export function allChallenges(s: AppState): ChallengeDef[] {
  const custom = s.customChallenges.map<ChallengeDef>((c) => ({
    id: `custom:${c.id}`, icon: '✏️', title: c.title, description: `Tổng đã góp đạt ${c.targetAmount.toLocaleString('vi-VN')}đ.`, target: c.targetAmount, unit: 'đ',
    reward: badge(`badge-custom-${c.id}`, 'Huy hiệu tự tạo', '🎀'), value: (st) => confirmedTotals(st.contributions).total,
  }))
  return [...BASE_CHALLENGES, ...custom]
}

export { bestStreak }
