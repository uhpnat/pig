import { Clock } from 'lucide-react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { fmtDate, vnd } from '@/domain/format'
import type { Member } from '@/domain/types'
import type { CountdownTime } from '@/hooks/useCountdown'

interface FinalSummaryCardProps {
  targetDateStr: string
  confirmedTotal: number
  goal: number
  progress: number
  memberMale: Member
  memberFemale: Member
  pctMale: number
  pctFemale: number
  timeLeft: CountdownTime
}

export function FinalSummaryCard({
  targetDateStr,
  confirmedTotal,
  goal,
  progress,
  memberMale,
  memberFemale,
  pctMale,
  pctFemale,
  timeLeft,
}: FinalSummaryCardProps) {
  const boxes = [
    { val: String(timeLeft.days), label: 'Ngày' },
    { val: String(timeLeft.hours).padStart(2, '0'), label: 'Giờ' },
    { val: String(timeLeft.minutes).padStart(2, '0'), label: 'Phút' },
    { val: String(timeLeft.seconds).padStart(2, '0'), label: 'Giây' },
  ]

  return (
    <div className="rounded-2xl border border-purple-100/90 bg-gradient-to-r from-purple-50/80 via-white to-pink-50/80 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-purple-700">
            <Clock size={12} /> Quỹ cuối kỳ ({fmtDate(targetDateStr)})
          </span>
          <p className="mt-0.5 text-lg font-black text-[#1e1b4b] tabular-nums">
            <AnimatedNumber value={confirmedTotal} format={(n) => vnd(Math.round(n))} />{' '}
            <span className="text-xs font-bold text-slate-400">/ {vnd(goal)}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-2.5 py-1 text-xs font-black text-white shadow-sm tabular-nums">
            🎯 {progress.toFixed(1)}%
          </span>
          <p className="mt-1 text-[10px] font-extrabold text-slate-500">
            👦 {memberMale.name} {pctMale.toFixed(0)}% · 👧 {memberFemale.name} {pctFemale.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
        {boxes.map((b) => (
          <div key={b.label} className="rounded-xl border border-purple-100 bg-white py-1.5 shadow-sm">
            <p className="text-base font-black leading-none text-purple-700 tabular-nums">{b.val}</p>
            <p className="mt-0.5 text-[9px] font-extrabold uppercase text-slate-400">{b.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
