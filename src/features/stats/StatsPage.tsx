import { ChevronLeft } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import { fmtDate, millions, pct, vnd } from '@/domain/format'
import {
  actualShares,
  confirmedTotals,
  currentStreak,
  estimateCompletion,
  inPeriod,
  monthlySeries,
  type Period,
} from '@/domain/stats'
import { useJourney, useStore } from '@/hooks/useStore'

const PERIOD_TABS: { id: Period; label: string }[] = [
  { id: '1m', label: '1 tháng' },
  { id: '3m', label: '3 tháng' },
  { id: '6m', label: '6 tháng' },
  { id: '1y', label: '1 năm' },
]

export default function StatsPage() {
  const j = useJourney()
  const { state, today, progress } = useStore()
  const nav = useNavigate()
  const [period, setPeriod] = useState<Period>('1m')

  const d = useMemo(() => {
    const cs = state.contributions
    const inP = inPeriod(cs, period, today)
    const total = confirmedTotals(cs)
    const inPTotals = confirmedTotals(inP)
    const monthly = monthlySeries(cs)
    return {
      total,
      inPTotals,
      monthly,
      actual: actualShares(cs),
      streak: currentStreak(cs, today),
      eta: estimateCompletion(j, cs, today),
    }
  }, [state, period, today, j])

  // Build 4 recent month bars (e.g., T9, T10, T11, T12) matching 06_statistics.png
  const bars = useMemo(() => {
    if (d.monthly.length >= 4) return d.monthly.slice(-4)
    const curMonth = Number(today.slice(5, 7))
    const items = []
    for (let offset = 3; offset >= 0; offset--) {
      const m = ((curMonth - 1 - offset + 12) % 12) + 1
      const label = `T${m}`
      const found = d.monthly.find((x) => x.label.startsWith(`${label}/`))
      items.push({
        label,
        total: found ? found.total : offset === 0 ? d.total.total : 0,
      })
    }
    return items
  }, [d.monthly, d.total.total, today])

  const maxBar = Math.max(1, ...bars.map((b) => b.total))

  return (
    <div
      className="min-h-[100dvh] px-4 pb-10"
      style={{
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #e0f2fe 0%, #f5efff 40%, #ffeef5 100%)',
      }}
    >
      {/* Header matching 06_statistics.png */}
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => nav('/')}
          className="absolute left-0 grid h-10 w-10 cursor-pointer place-items-center rounded-full border-0 bg-white/80 text-[#1e1b4b] shadow-sm"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <h1 className="text-[20px] font-black text-[#172554]">Thống kê</h1>
      </div>

      {/* 4 Pill Period Tabs matching 06_statistics.png */}
      <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label="Khoảng thời gian">
        {PERIOD_TABS.map((t) => {
          const active = period === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setPeriod(t.id)}
              className={`cursor-pointer rounded-full border-0 py-2 text-[13px] font-black transition-all ${
                active
                  ? 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white shadow-[0_6px_14px_rgba(59,130,246,.35)]'
                  : 'bg-white/75 text-[#475569]'
              }`}
              style={{ fontFamily: 'inherit' }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Card 1: Tổng tiền đã tiết kiệm */}
      <div className="mt-4 flex items-center justify-between rounded-[28px] border-2 border-white bg-gradient-to-br from-white via-white to-[#e0f2fe] p-5 shadow-[0_12px_28px_rgba(143,124,240,.14)]">
        <div>
          <p className="text-[14px] font-black text-[#1e1b4b]">Tổng tiền đã tiết kiệm</p>
          <p className="mt-1 text-[32px] font-black leading-none tracking-tight text-[#172554]">
            {vnd(d.inPTotals.total || d.total.total)}
          </p>
          <p className="mt-2 text-xs font-extrabold text-[#16a34a]">
            ↑ Đạt {pct(progress)} mục tiêu · Chuỗi {d.streak} ngày
          </p>
        </div>
        {/* 3 Blue Glossy Bars Icon */}
        <div className="flex h-16 items-end gap-1.5 rounded-2xl bg-[#eff6ff] p-2.5 shadow-inner" aria-hidden>
          <span className="h-5 w-3 rounded-md bg-gradient-to-b from-[#60a5fa] to-[#3b82f6]" />
          <span className="h-8 w-3 rounded-md bg-gradient-to-b from-[#60a5fa] to-[#3b82f6]" />
          <span className="h-11 w-3 rounded-md bg-gradient-to-b from-[#38bdf8] to-[#2563eb]" />
        </div>
      </div>

      {/* Card 2: Tỷ lệ đóng góp */}
      <div className="mt-4 rounded-[28px] border-2 border-white bg-white/95 p-5 shadow-[0_12px_28px_rgba(143,124,240,.14)]">
        <h2 className="text-[16px] font-black text-[#172554]">Tỷ lệ đóng góp</h2>
        <div className="mt-3.5 space-y-3.5">
          {(['a', 'b'] as const).map((k, idx) => {
            const m = j.members[k]
            const p = d.actual[k] * 100
            const barBg =
              idx === 0
                ? 'linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)'
                : 'linear-gradient(90deg, #ff7aa2 0%, #ec4899 100%)'
            return (
              <div key={k} className="flex items-center gap-3">
                <Avatar value={m.avatar} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-black text-[#172554]">{m.name}</span>
                    <span className="text-[15px] font-black text-[#172554]">{p.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(6, Math.min(100, p))}%`, background: barBg }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Card 3: Tiến độ theo tháng matching 06_statistics.png */}
      <div className="mt-4 rounded-[28px] border-2 border-white bg-white/95 p-5 shadow-[0_12px_28px_rgba(143,124,240,.14)]">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-black text-[#172554]">Tiến độ theo tháng</h2>
          <span className="rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] px-3 py-1 text-xs font-black text-white shadow">
            {millions(d.total.total)}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-4 items-end gap-4 px-2" style={{ height: 140 }}>
          {bars.map((b, idx) => {
            const hPct = Math.max(22, Math.round((b.total / maxBar) * 100))
            const isLast = idx === bars.length - 1
            return (
              <div key={b.label} className="flex h-full flex-col items-center justify-end">
                <div
                  className="w-11 rounded-2xl transition-all duration-700"
                  style={{
                    height: `${hPct}%`,
                    background: isLast
                      ? 'linear-gradient(180deg, #38bdf8 0%, #6366f1 100%)'
                      : 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 100%)',
                    boxShadow: isLast ? '0 8px 18px rgba(99,102,241,.35)' : '0 4px 10px rgba(56,189,248,.25)',
                  }}
                />
                <span className="mt-2 text-xs font-extrabold text-[#64748b]">{b.label}</span>
              </div>
            )
          })}
        </div>

        {d.eta && (
          <p className="mt-4 border-t border-[#f1f5f9] pt-3 text-center text-xs font-bold text-[#64748b]">
            Dự kiến hoàn thành mục tiêu {vnd(j.goal)} vào khoảng <b>{fmtDate(d.eta.date)}</b>
          </p>
        )}
      </div>
    </div>
  )
}
